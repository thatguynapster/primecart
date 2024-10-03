"use client";

import { Form, Formik, FormikHelpers } from "formik";
import { object } from "yup";
import React from "react";

import { Button } from "@/components/global/button";
import * as Field from "@/components/global/Field";
import * as schema from "@/lib/schema";

type Props = {
  data?: BankData | null;
  onSave: (
    values: BankData,
    actions: Pick<FormikHelpers<BankData>, "setSubmitting">
  ) => void;
};

export type BankData = {
  bank_name: string;
  account_name: string;
  account_number: string;
  swift_code: string;
  iban: string;
  currency: string;
  country: string;
  state: string;
  city: string;
  address: string;
  zip_code: string;
};

const Bank = ({ data, onSave }: Props) => {
  return (
    <Formik
      validateOnMount
      enableReinitialize
      validationSchema={object({
        bank_name: schema.requireString("Bank Name"),
        account_name: schema.requireString("Account Name"),
        account_number: schema.requireString("Account Number"),
        swift_code: schema.requireString("SWIFT Code"),
        currency: schema.requireString("Currency"),
        country: schema.requireString("Country"),
        state: schema.requireString("State"),
        city: schema.requireString("City"),
        address: schema.requireString("Address"),
        zip_code: schema.requireString("Zip Code"),
      })}
      initialValues={{
        swift_code: data?.swift_code ?? "",
        iban: data?.iban ?? "",
        account_number: data?.account_number ?? "",
        account_name: data?.account_name ?? "",
        bank_name: data?.bank_name ?? "",
        currency: data?.currency ?? "",
        country: data?.country ?? "",
        state: data?.state ?? "",
        city: data?.city ?? "",
        address: data?.address ?? "",
        zip_code: data?.zip_code ?? "",
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
        <Form className="flex flex-col gap-4 max-h-[566px] overflow-auto">
          <Field.Group
            className="w-full"
            name="swift_code"
            label="SWIFT / BIC"
            required
          >
            <Field.Input
              as="input"
              name="swift_code"
              type="text"
              value={values.swift_code}
              placeholder="Eg: GTBIGHAC"
            />
          </Field.Group>

          <Field.Group className="w-full" name="iban" label="IBAN">
            <Field.Input
              as="input"
              name="iban"
              type="text"
              value={values.iban}
              placeholder="Eg: AT48320J3K0012345864"
            />
          </Field.Group>

          <Field.Group
            className="w-full"
            name="account_number"
            label="Account Number"
            required
          >
            <Field.Input
              as="input"
              name="account_number"
              type="text"
              value={values.account_number}
              placeholder="Eg: 1234567890987"
            />
          </Field.Group>

          <Field.Group
            className="w-full"
            name="account_name"
            label="Full Name of Account Holder"
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
            name="bank_name"
            label="Bank Name"
            required
          >
            <Field.Input
              as="input"
              name="bank_name"
              type="text"
              value={values.bank_name}
              placeholder="Eg: Guaranty Trust Bank"
            />
          </Field.Group>

          <Field.Group
            className="w-full"
            name="currency"
            label="Currency"
            required
          >
            <Field.Input
              as="input"
              name="currency"
              type="text"
              value={values.currency}
              placeholder="Eg: GHS"
            />
          </Field.Group>

          <Field.Group
            className="w-full"
            name="country"
            label="Country"
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

          <Field.Group className="w-full" name="state" label="State" required>
            <Field.Input
              as="input"
              name="state"
              type="text"
              value={values.state}
              placeholder="Eg: Greater accra"
            />
          </Field.Group>

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
            name="address"
            label="Address Line 1"
            required
          >
            <Field.Input
              as="input"
              name="address"
              type="text"
              value={values.address}
              placeholder="Eg: 23 Bleeder St"
            />
          </Field.Group>

          <Field.Group
            className="w-full"
            name="zip_code"
            label="Zip / Postal Code"
            required
          >
            <Field.Input
              as="input"
              name="zip_code"
              type="text"
              value={values.zip_code}
              placeholder="Eg: John Asrifi"
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

export default Bank;
