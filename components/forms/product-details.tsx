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
import { redirect, useRouter } from "next/navigation";
import { createProduct } from "@/lib/queries";
import { routes } from "@/routes";
import toast from "react-hot-toast";

type Props = { business_id: string; data?: Products };

interface Variation {
  price: number;
  quantity: number;
  attributes: Record<string, string>;
}
interface FormData {
  name: string;
  description: string;
  images: string[];
  business_id: string;
  category_id: string;
  cost_price: number;

  variations: Variation[];
}

const ProductDetails = ({ business_id, data }: Props) => {
  const { setOpen, setClose } = useModal();
  const router = useRouter();

  const [editVariant, setEditVariant] = useState<{
    values: Variation;
    index: number;
  } | null>(null);

  //  WIP: get product categories from db
  const categories: SelectOptions[] = [
    {
      label: "Category 1",
      value: "66ce5ab722337a2f84311559",
    },
  ];

  //  WIP: create product in db
  const _createProduct = async (
    product: FormData,
    { setSubmitting }: Pick<FormikHelpers<FormData>, "setSubmitting">
  ) => {
    try {
      console.log(product);
      const { variations: _, ...productData } = product;

      await createProduct(productData, [...product.variations]);

      toast.success(`Product ${product.name} added.`);
      router.push(routes.inventory.index.replace(":business_id", business_id));
    } catch (error) {
      throw new Error("Failed to create product", { cause: error });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik
      validateOnMount
      enableReinitialize
      validationSchema={object({
        name: schema.requireString("Product Name"),
        images: schema.requireArray("Product Images").min(1),
        category_id: schema.requireString("Category"),
        cost_price: schema.requireNumber("Cost Price"),
      })}
      initialValues={{
        name: "",
        description: "",
        images: [],
        business_id: business_id,
        category_id: categories[0].value ?? "",
        cost_price: 0,

        variations: [],
      }}
      onSubmit={(values: FormData, { setSubmitting }) => {
        setSubmitting(true);
        _createProduct(values, { setSubmitting });
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
                  label="Name"
                  required
                >
                  <Field.Input
                    as="input"
                    name="name"
                    type="text"
                    value={values.name}
                    placeholder="Eg: Google Pixel 8 Pro"
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
                  placeholder="Eg: 10.99"
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
                    {values.variations?.map((variant, i) => (
                      <tr key={i} className="group">
                        <Table.TD>
                          {Object.values(variant.attributes)
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
                                  setEditVariant({
                                    values: variant,
                                    index: i,
                                  });
                                }}
                              >
                                <Pencil size={16} />
                              </div>
                              <div
                                className="p-2 cursor-pointer bg-error rounded-lg"
                                onClick={() => {
                                  const updatedVariants = [
                                    ...values.variations!,
                                  ];
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

                    {!values.variations?.length && (
                      <Table.Empty
                        field="variants"
                        title="Save a variant to see them here"
                      />
                    )}
                  </tbody>
                </Table>
              </div>

              <VariantDetails
                data={editVariant}
                addVariant={(variants) => {
                  //  check if editing product
                  if (editVariant) {
                    const updatedVariants = [...values.variations!];
                    updatedVariants[editVariant.index] = variants;

                    setEditVariant(null);
                    console.log(updatedVariants);
                    return setFieldValue("variations", updatedVariants);
                  }

                  const newVariants = [...values.variations!];
                  newVariants.push(variants);
                  console.log(newVariants);

                  setFieldValue("variations", newVariants);
                }}
              />
            </div>

            <Button
              className="w-max"
              disabled={!isValid}
              type="submit"
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
