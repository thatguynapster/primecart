"use client";

import { Products, ProductVariations } from "@prisma/client";
import { Form, Formik, FormikHelpers } from "formik";
import { Pencil, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { object } from "yup";

import { SelectOptions } from "../global/Field/Select/Select";
import AddCategoryModal from "./products/add-category-modal";
import ProductImages from "../inventory/product-images";
import VariantDetails from "./products/variant-details";
import { useModal } from "@/providers/modal-provider";
import * as Field from "@/components/global/Field";
import { Button } from "../global/button";
import { Table } from "../global/Table";
import * as schema from "@/lib/schema";
import { useRouter } from "next/navigation";

type Props = { data?: Products };

const ProductDetails = ({ data }: Props) => {
  const { setOpen, setClose } = useModal();
  const router = useRouter();

  const [editVariant, setEditVariant] = useState<{
    values: Partial<ProductVariations>;
    index: number;
  } | null>(null);

  //  WIP: get product categories from db
  const categories: SelectOptions[] = [
    {
      label: "Category 1",
      value: "category_1",
    },
  ];

  //  WIP: create product in db
  const createProduct = async (
    product: Partial<Products & { variants: Partial<ProductVariations>[] }>,
    {
      setSubmitting,
      resetForm,
    }: Pick<
      FormikHelpers<Products & { variants: Partial<ProductVariations>[] }>,
      "setSubmitting" | "resetForm"
    >
  ) => {
    console.log(product);

    setTimeout(() => {
      // resetForm();
      // setSubmitting(false);
      router.back();
    }, 3000);
  };

  return (
    <Formik
      validateOnMount
      enableReinitialize
      validationSchema={object({
        name: schema.requireString("Product Name"),
        cost_price: schema.requireString("Cost Price"),
        category_id: schema.requireString("Category"),
        images: schema.requireArray("Product Images").min(1),
      })}
      initialValues={{
        name: "",
        description: "",
        images: [],
        business_id: "",
        category_id: "",
        cost_price: "",

        variants: [],
      }}
      onSubmit={async (
        values: Partial<Products & { variants: Partial<ProductVariations>[] }>,
        {
          setSubmitting,
          resetForm,
        }: Pick<
          FormikHelpers<Products & { variants: Partial<ProductVariations>[] }>,
          "setSubmitting" | "resetForm"
        >
      ) => {
        await createProduct(values, { setSubmitting, resetForm });
      }}
    >
      {({ values, isValid, isSubmitting, handleSubmit, setFieldValue }) => (
        <Form className="flex flex-col lg:flex-row gap-4">
          <div className="flex flex-col gap-4 w-full">
            {/* product details */}
            <div className="flex flex-col gap-4 p-6 rounded-lg border-2">
              <div className="flex flex-col lg:flex-row gap-4">
                <Field.Group
                  className="w-full"
                  name="name"
                  label="Product Name"
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
                  name="category_id"
                  label="Category"
                  required
                >
                  <Field.Select
                    addNew={{
                      text: "Add New Category",
                      action: () => {
                        setOpen(<AddCategoryModal {...{ setClose }} />);
                      },
                    }}
                    defaultValue={categories[0].value}
                    value={values.category_id!}
                    options={categories}
                    onChange={({ value }: SelectOptions) => {
                      setFieldValue("category_id", value);
                    }}
                    placeholder="Select Category"
                  />
                </Field.Group>
              </div>

              <Field.Group name="details" label="Product Description">
                <Field.TextEditor
                  content={values.description}
                  onChange={(data: any) => {
                    setFieldValue("description", data);
                  }}
                />
              </Field.Group>

              <Field.Group
                className="lg:w-1/2"
                name="cost_price"
                label="Cost Price"
                required
              >
                <Field.Input
                  as="input"
                  name="cost_price"
                  type="number"
                  min={0}
                  step={0.1}
                  value={values.cost_price}
                  placeholder="Bleeder Crafts"
                />
              </Field.Group>
            </div>

            {/* product variants */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex flex-col gap-4 rounded-lg border-2 w-full h-max">
                <Table>
                  <thead>
                    <tr>
                      <Table.TH>Name</Table.TH>
                      <Table.TH className="justify-evenly">Quantity</Table.TH>
                      <Table.TH className="justify-end">Price</Table.TH>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {values.variants?.map((variant, i) => (
                      <tr key={i} className="group">
                        <Table.TD>
                          {Object.values(variant.attributes!)
                            .map((attr, i) => attr)
                            .join(" / ")}
                        </Table.TD>
                        <Table.TD className="justify-evenly">
                          {variant.quantity}
                        </Table.TD>
                        <Table.TD className="justify-end">
                          <div className="flex items-center relative">
                            <p>GHs {variant.price}</p>
                            <div className="absolute right-0 bg-dark dark:bg-light rounded-lg text-light dark:text-dark hidden group-hover:flex">
                              <div
                                className="p-2 cursor-pointer"
                                onClick={() => {
                                  setEditVariant({ values: variant, index: i });
                                }}
                              >
                                <Pencil size={16} />
                              </div>
                              <div
                                className="p-2 cursor-pointer bg-error rounded-lg"
                                onClick={() => {
                                  const updatedVariants = [...values.variants!];
                                  updatedVariants.splice(i, 1);

                                  setFieldValue("variants", updatedVariants);
                                }}
                              >
                                <Trash2 size={16} />
                              </div>
                            </div>
                          </div>
                        </Table.TD>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              <VariantDetails
                data={editVariant}
                addVariant={(variants, { setSubmitting }) => {
                  //  check if editing product
                  if (editVariant) {
                    const updatedVariants = [...values.variants!];
                    updatedVariants[editVariant.index] = variants;

                    setEditVariant(null);
                    return setFieldValue("variants", updatedVariants);
                  }

                  console.log(variants);

                  const newVariants = [...values.variants!];
                  newVariants.push(variants);

                  setFieldValue("variants", newVariants);

                  setTimeout(() => {
                    setSubmitting(false);
                  }, 3000);
                }}
              />
            </div>

            <Button
              className="w-max"
              disabled={!isValid}
              type="button"
              onClick={() => {
                handleSubmit();
              }}
              {...{ isSubmitting }}
            >
              Create Product
            </Button>
          </div>

          {/* product images */}
          <ProductImages
            onUpdate={(images: string[]) => {
              setFieldValue("images", images);
            }}
          />
        </Form>
      )}
    </Formik>
  );
};

export default ProductDetails;
