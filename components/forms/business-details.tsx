"use client";

import { Form, Formik, FormikHelpers } from "formik";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { object, ref } from "yup";

import { removeFile, uploadFile } from "@/lib/file-handler";
import SingleFileUpload from "../global/single-file-upload";
import * as Field from "@/components/global/Field";
import { Button } from "../global/button";
import { Business, Location } from "@/lib/types";
import * as schema from "@/lib/schema";
import { routes } from "@/routes";
import { currentUser } from "@clerk/nextjs/server";
import { createBusiness, createUser } from "@/lib/queries";

type Props = { user: any };

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

const BusinessDetails = ({ user }: Props) => {
  const router = useRouter();

  const [logoID, setLogoId] = useState<string>();

  const handleImageUpload = async ({
    file,
    actions: { setFieldValue },
  }: {
    file: File;
    actions: Pick<FormikHelpers<Partial<Business>>, "setFieldValue">;
  }) => {
    const response = await uploadFile({
      bucket: "business",
      file,
    });
    setFieldValue("logo", response?.href);
    setLogoId(response?.file_id);
    console.log(response);
  };

  const deleteFile = async ({
    actions: { setFieldValue },
  }: {
    actions: Pick<FormikHelpers<Partial<Business>>, "setFieldValue">;
  }) => {
    console.log(logoID);
    toast.loading("removing logo", { duration: Infinity });

    await removeFile({
      bucket: "business",
      file_id: logoID!,
    });

    setFieldValue("logo", "");
    toast.dismiss();
  };

  const handleSubmit = async (
    values: FormData,
    actions: Pick<FormikHelpers<Partial<FormData>>, "setSubmitting">
  ) => {
    try {
      console.log(values, user);

      // create user
      console.log("creating user");
      const newUser = await createUser(user);
      console.log(newUser);

      // create business
      const businessData = {
        ...values,
        location: JSON.stringify(values.location),
        user: newUser.$id,
      };
      console.log(businessData);
      console.log("creating business");
      const business = await createBusiness(businessData);
      console.log(business);
      toast.success("account created");
      router.push(routes.launchpad);
    } catch (error) {
      console.log(error);
      toast.error("Failed to create business");
    } finally {
      actions.setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-[850px] border-2 p-6 rounded-xl">
      <h1 className="text-xl text-center font-bold">Business Information</h1>

      <p className="text-sm font-medium text-center">
        Let's create and agency for your business. You can edit agency settings
        later from the agency settings tab.
      </p>

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
          logo: "",
          name: "",
          email: "",
          location: {
            address: "",
            latitude: 0,
            longitude: 0,
            country: "",
            city: "",
          },
          phone: "",
          country: "",
          city: "",
          state: "",
          zip_code: "",
        }}
        onSubmit={(values, { setSubmitting }) => {
          console.log("submitting...");
          setSubmitting(true);
          console.log(values);
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
                onValueChanged={(file: File) => {
                  handleImageUpload({ file, actions: { setFieldValue } });
                }}
                deleteFile={() => {
                  deleteFile({ actions: { setFieldValue } });
                }}
                {...{ setFieldTouched }}
              />
            </Field.Group>

            <div className="flex gap-4 w-full">
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

            <div className="flex gap-4">
              <Field.Group
                className="!mb-0"
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

            <div className="flex gap-4">
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

            <Button
              className="w-max"
              type="submit"
              disabled={!isValid}
              onClick={() => {
                console.log("submit form data");
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
