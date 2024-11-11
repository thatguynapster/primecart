"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import { Formik } from "formik";
import { object } from "yup";

import VariationAttribute from "./variation-attribute";
import { Button } from "@/components/global/button";
import * as Field from "@/components/global/Field";
import { classNames } from "@/lib/utils";
import * as schema from "@/lib/schema";
import { Plus } from "lucide-react";

type Props = {
  data: { values: FormData; index: number } | null;
  addVariant: (values: FormData) => void;
};

interface FormData {
  price: number;
  quantity: number;
  attributes: { [key: string]: string };
}

const VariantDetails = ({ data, addVariant }: Props) => {
  const [attributeKey, setAttributeKey] = useState<string>("");
  const [attributeValue, setAttributeValue] = useState<string>("");

  return (
    <Formik
      validateOnMount
      enableReinitialize
      validationSchema={object({
        price: schema.requireString("Sale Price"),
        quantity: schema.requireNumber("Quantity"),
      })}
      initialValues={{
        price: data?.values.price ?? 0,
        quantity: data?.values.quantity ?? 1,
        attributes: data?.values.attributes ?? {},
      }}
      onSubmit={(values: FormData) => {
        addVariant(values);
      }}
    >
      {({
        values,
        isValid,
        isSubmitting,
        handleSubmit,
        setFieldValue,
        resetForm,
      }) => (
        <div className="flex flex-col gap-4 p-6 rounded-lg border-2 w-full">
          <h1 className="text-lg font-semibold">Product Variants</h1>
          <Field.Group name="price" label="Sale Price" required>
            <Field.Input
              as="input"
              name="price"
              type="number"
              min={0}
              step={0.1}
              value={values.price}
              placeholder="Eg: 10.99"
            />
          </Field.Group>

          <Field.Group name="quantity" label="Quantity" required>
            <Field.Input
              as="input"
              name="quantity"
              type="number"
              min={1}
              value={values.quantity}
              placeholder="Eg: 10"
            />
          </Field.Group>

          <Field.Group name="attribute" label="Attributes">
            {Object.keys(values.attributes).length > 0 && (
              <div
                className={classNames(
                  "flex flex-col",
                  "divide-y divide-gray",
                  "border border-gray",
                  "rounded-lg"
                )}
              >
                {Object.keys(values.attributes).map((key, i) => (
                  <VariationAttribute
                    key={i}
                    onRemove={(key: string) => {
                      const updatedAttributes = { ...values.attributes };
                      delete updatedAttributes[key];
                      setFieldValue("attributes", updatedAttributes);
                    }}
                    data={{ key, value: values.attributes[key] }}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-2 items-center">
              <Field.Input
                as="input"
                name="attribute_key"
                type="text"
                value={attributeKey}
                placeholder="Eg: Colour"
                onChange={({
                  currentTarget: { value },
                }: {
                  currentTarget: { value: string };
                }) => {
                  setAttributeKey(value);
                }}
              />
              {":"}
              <Field.Input
                as="input"
                name="attribute_value"
                type="text"
                value={attributeValue}
                placeholder="Eg: Red"
                onChange={({
                  currentTarget: { value },
                }: {
                  currentTarget: { value: string };
                }) => {
                  setAttributeValue(value);
                }}
              />
              <Button
                className="!p-2"
                type="button"
                onClick={() => {
                  // check if attributes already has this attribute key
                  if (values.attributes.hasOwnProperty(attributeKey)) {
                    return toast(
                      `${attributeKey} already added to variation attributes`
                    );
                  }
                  // check if attribute key/value is not empty
                  if (attributeKey === "") {
                    return toast.error("Attribute name cannot be empty");
                  }
                  if (attributeValue === "") {
                    return toast.error("Attribute value cannot be empty");
                  }

                  let attributes = { ...values.attributes };
                  attributes[attributeKey!] = attributeValue;

                  setAttributeKey("");
                  setAttributeValue("");

                  setFieldValue("attributes", attributes);
                }}
              >
                <Plus size={16} />
              </Button>
            </div>
          </Field.Group>

          <Button
            className="w-max"
            disabled={!isValid}
            type="button"
            onClick={() => {
              handleSubmit();
              setTimeout(() => {
                resetForm();
              });
            }}
          >
            Save Variant
          </Button>
        </div>
      )}
    </Formik>
  );
};

export default VariantDetails;
