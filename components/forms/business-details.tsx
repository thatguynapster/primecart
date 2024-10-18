"use client";

import { useParams, useRouter } from "next/navigation";
import { Form, Formik, FormikHelpers } from "formik";
import React, { useEffect, useState } from "react";
import { Business } from "@prisma/client";
import toast from "react-hot-toast";
import { object } from "yup";
import { v4 } from "uuid";

import ConfirmBusinessDelete from "./settings/confirm-business-delete";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { deleteFile, handleImageUpload } from "@/lib/file-handler";
import SingleFileUpload from "../global/single-file-upload";
import { createBusiness, initUser } from "@/lib/queries";
import { useModal } from "@/providers/modal-provider";
import * as Field from "@/components/global/Field";
import { classNames } from "@/lib/helpers";
import { Button } from "../global/button";
import { Location } from "@/lib/types";
import * as schema from "@/lib/schema";
import { routes } from "@/routes";

type Props = { data?: Partial<Business> | null };

interface FormData {
  name: string;
  logo: string;
  email: string;
  phone: string;
  location: Location;
  country: string;
  city: string;
  state: string;
  zip_code: string;
}

const BusinessDetails = ({ data }: Props) => {
  const params = useParams<{ business_id: string }>();
  const router = useRouter();

  const [logoID, setLogoId] = useState<string>();
  const { setOpen } = useModal();
  ``;

  const handleSubmit = async (
    values: FormData,
    actions: Pick<FormikHelpers<Partial<FormData>>, "setSubmitting">
  ) => {
    try {
      // create user
      const authUser = await initUser();

      const business = await createBusiness({
        unique_id: data?.unique_id ?? v4(),
        name: values.name,
        email: values.email,
        logo: values.logo,
        phone: values.phone,
        country: values.country,
        city: values.city,
        state: values.state,
        zip_code: values.zip_code,
        is_deleted: false,
        deletedAt: null,
        user_id: authUser?.id!,
        location: {
          address: values.location.address,
          country: values.location.country,
          country_code: values.location.country_code,
          city: values.location.city,
          longitude: values.location.longitude,
          latitude: values.location.latitude,
          region: values.location.region,
        },
      });

      toast.success(`account ${data ? "updated" : "created"}`);

      if (!data)
        router.push(routes.launchpad.replace(":business_id", business.id));
    } catch (error) {
      console.log(error);
      toast.error("Failed to create business");
    } finally {
      actions.setSubmitting(false);
    }
  };

  useEffect(() => {
    setLogoId(data?.logo?.split("files/")[1].split("/")[0]);
  }, [data]);

  return (
    <div
      className={classNames(
        "flex flex-col gap-4",
        "w-full max-w-[850px]",
        "border-2 p-6 rounded-xl",
        "bg-light dark:bg-dark"
      )}
    >
      <h1 className="text-xl text-center font-bold">Business Information</h1>

      {!params.business_id && (
        <p className="text-sm font-medium text-center">
          Let's create an agency for your business. You can edit agency settings
          later from the agency settings tab.
        </p>
      )}

      <Formik
        validateOnMount
        enableReinitialize
        validationSchema={object({
          logo: schema.requireString("Business Logo"),
          name: schema.requireString("Business Name"),
          email: schema.requireString("Business Email"),
          location: object().shape({
            address: schema.requireString("Location"),
          }),
          phone: schema.requirePhoneNumber("Business Phone Number"),
          country: schema.requireString("Business Country"),
          city: schema.requireString("City"),
          state: schema.requireString("State"),
          zip_code: schema.requireString("Zip Code"),
        })}
        initialValues={{
          logo: data?.logo ?? "",
          name: data?.name ?? "",
          email: data?.email ?? "",
          location: {
            address: data?.location?.address ?? "",
            latitude: data?.location?.latitude ?? 0,
            longitude: data?.location?.longitude ?? 0,
            country: data?.location?.country ?? "",
            city: data?.location?.city ?? "",
            country_code: data?.location?.country_code ?? "",
            region: data?.location?.region ?? "",
          },
          phone: data?.phone ?? "",
          country: data?.country ?? "",
          city: data?.city ?? "",
          state: data?.state ?? "",
          zip_code: data?.zip_code ?? "",
        }}
        onSubmit={(values, { setSubmitting }) => {
          setSubmitting(true);

          handleSubmit(values, { setSubmitting });
        }}
      >
        {({
          values,
          isValid,
          isSubmitting,
          setFieldValue,
          setFieldTouched,
          handleSubmit,
        }) => (
          <Form className="flex flex-col gap-4">
            <Field.Group
              className="w-full"
              name="business_logo"
              label="Business Logo"
              required
            >
              <SingleFileUpload
                value={values.logo}
                name="images"
                type={"image"}
                onValueChanged={async (file: File) => {
                  const uploaded_file = await handleImageUpload(
                    file,
                    "business"
                  );
                  setFieldValue("logo", uploaded_file.href);
                  setLogoId(uploaded_file.file_id);
                }}
                deleteFile={async () => {
                  console.log(logoID);
                  await deleteFile(logoID!, "business");

                  setFieldValue("logo", "");
                }}
                {...{ setFieldTouched }}
              />
            </Field.Group>

            <div className="flex flex-col lg:flex-row gap-4 w-full">
              <Field.Group
                className="w-full"
                name="name"
                label="Business Name"
                required
              >
                <Field.Input
                  as="input"
                  name="name"
                  type="text"
                  value={values.name}
                  placeholder="Bleeder Crafts"
                />
              </Field.Group>

              <Field.Group
                className="w-full"
                name="email"
                label="Business Email"
                required
              >
                <Field.Input
                  as="input"
                  name="email"
                  type="email"
                  value={values.email}
                  placeholder="Eg: example@domain.com"
                />
              </Field.Group>
            </div>

            <Field.Group
              className="w-full"
              name="location"
              label="Business Address"
              required
            >
              <Field.Place
                name="location"
                value={values.location}
                placeholder="Eg: 23 Bleeder St"
                {...{ setFieldValue, setFieldTouched }}
              />
            </Field.Group>

            <div className="flex flex-col lg:flex-row gap-4">
              <Field.Group
                className="w-full"
                name="phone"
                label="Business Phone Number"
                required
              >
                <Field.Phone
                  name="phone"
                  value={values.phone?.split("+")?.pop() ?? ""}
                  {...{ setFieldValue, setFieldTouched }}
                  placeholder="020 000 0000"
                />
              </Field.Group>

              <Field.Group
                className="w-full"
                name="country"
                label="Business Country"
                required
              >
                <Field.Input
                  as="input"
                  name="country"
                  type="text"
                  value={values.country}
                  placeholder="Eg: Ghana"
                />
              </Field.Group>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
              <Field.Group className="w-full" name="city" label="City" required>
                <Field.Input
                  as="input"
                  name="city"
                  type="text"
                  value={values.city}
                  placeholder="Eg: Accra"
                />
              </Field.Group>

              <Field.Group
                className="w-full"
                name="state"
                label="State"
                required
              >
                <Field.Input
                  as="input"
                  name="state"
                  type="text"
                  value={values.state}
                  placeholder="Eg: Greater Accra"
                />
              </Field.Group>

              <Field.Group
                className="w-full"
                name="zip_code"
                label="Zip Code"
                required
              >
                <Field.Input
                  as="input"
                  name="zip_code"
                  type="text"
                  value={values.zip_code}
                  placeholder="Eg: 00233"
                />
              </Field.Group>
            </div>

            {params.business_id && (
              <Card className="!p-4 !border-error">
                <CardHeader>
                  <CardTitle className="text-sm font-medium mb-4">
                    Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col lg:flex-row gap-4 lg:items-center">
                  <p className="text-sm font-medium">
                    Deleting your agency cannot be undone. This will also delete
                    all data related to your account.
                  </p>
                  <Button
                    className="w-max !bg-error !text-white !border-error"
                    type="button"
                    onClick={() => {
                      setOpen(<ConfirmBusinessDelete />);
                    }}
                  >
                    Delete Business
                  </Button>
                </CardContent>
              </Card>
            )}

            <Button
              className="w-max"
              type="submit"
              disabled={!isValid}
              onClick={() => {
                handleSubmit();
              }}
              {...{ isSubmitting }}
            >
              Save Business Information
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default BusinessDetails;
