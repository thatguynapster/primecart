"use client";

import { Form, Formik, FormikHelpers } from "formik";
import { object } from "yup";
import React from "react";

import { SelectOptions } from "@/components/global/Field/Select/Select";
import { Button } from "@/components/global/button";
import * as Field from "@/components/global/Field";
import * as schema from "@/lib/schema";
import { MoMo as MoMoType, Payment } from "@prisma/client";

type Props = {
  data: Payment | null,
  onSave: (
    values: MomoData,
    actions: Pick<FormikHelpers<MomoData>, "setSubmitting">
  ) => void;
};
export type MomoData = Omit<MoMoType, "recipient_id">

const providers = [
  {
    label: "MTN",
    value: "MTN",
  },
  {
    label: "Vodafone",
    value: "VODAFONE",
  },
  {
    label: "AirtelTigo",
    value: "AIRTELTIGO",
  },
];

const MoMo = ({ data, onSave }: Props) => {
  return (
    <Formik
      validateOnMount
      enableReinitialize
      validationSchema={object({
        provider: schema.requireString("MoMo Provider"),
        account_number: schema.requirePhoneNumber("Account Number"),
        account_name: schema.requireFullName("Account Name"),
      })}
      initialValues={{
        provider: data?.momo?.provider || providers[0].value || "MTN",
        account_number: data?.momo?.account_number || "",
        account_name: data?.momo?.account_name || "",
      }}
      onSubmit={(values, { setSubmitting }) => {
        setSubmitting(true);

        onSave(values, { setSubmitting });
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
            name="name"
            label="MoMo Provider"
            required
          >
            <Field.Select
              value={values.provider}
              options={providers}
              onChange={({ value }: SelectOptions) => {
                setFieldValue("provider", value);
              }}
              placeholder="Momo Provider"
            />
          </Field.Group>

          <Field.Group
            className="w-full"
            name="account_name"
            label="Name on Account"
            required
          >
            <Field.Input
              as="input"
              name="account_name"
              type="text"
              value={values.account_name}
              placeholder="Eg: John Asrifi"
            />
          </Field.Group>

          <Field.Group
            className="w-full"
            name="account_number"
            label="MoMo Number"
            required
          >
            <Field.Phone
              name="account_number"
              value={values.account_number?.split("+")?.pop() ?? ""}
              {...{ setFieldValue, setFieldTouched }}
              placeholder="020 000 0000"
            />
          </Field.Group>

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
  );
};

export default MoMo;
