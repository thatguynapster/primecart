"use client";

import { ProductCategories, Products, ProductVariations } from "@prisma/client";
import { Form, Formik, FormikHelpers } from "formik";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { object } from "yup";
import { v4 } from "uuid";

import { SelectOptions } from "../global/Field/Select/Select";
import AddCategoryModal from "./products/add-category-modal";
import ProductImages from "../inventory/product-images";
import VariantDetails from "./products/variant-details";
import { useModal } from "@/providers/modal-provider";
import * as Field from "@/components/global/Field";
import { deleteVariation, getCategories, upsertProduct } from "@/lib/queries";
import { Button } from "../global/button";
import { Table } from "../global/Table";
import * as schema from "@/lib/schema";

type Props = {
  business_id: string;
  data?: Products & { variations: (ProductVariations & { attributes: any })[] }; // WIP figure out the right types for attributes
};

interface Variation {
  price: number;
  quantity: number;
  attributes: Record<string, string>;
  unique_id?: string;
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
  const [categories, setCategories] = useState<SelectOptions[]>([]);

  //  WIP: create product in db
  const _createProduct = async (
    product: FormData,
    { setSubmitting }: Pick<FormikHelpers<FormData>, "setSubmitting">
  ) => {
    try {
      const { variations: _, ...productData } = product;

      await upsertProduct({
        product: {
          name: productData.name,
          description: productData.description,
          images: productData.images,
          business_id,
          category_id: productData.category_id,
          cost_price: productData.cost_price,
          unique_id: data?.unique_id ?? v4(),
        },
        variations: product.variations.map((variant) => ({
          unique_id: variant.unique_id ?? v4(),
          price: variant.price,
          quantity: variant.quantity,
          attributes: variant.attributes,
        })),
      });

      toast.success(`Product ${product.name} added.`);
      router.back();
    } catch (error) {
      throw new Error("Failed to create product", { cause: error });
    } finally {
      setSubmitting(false);
    }
  };
  useEffect(() => {
    const fetchCategories = async () => {
      return await getCategories(business_id);
    };

    fetchCategories().then((resp) => {
      setCategories(() => {
        return (
          resp?.map((category) => ({
            label: category.name,
            value: category.id,
          })) ?? []
        );
      });
    });
  }, []);

  return (
    <Formik
      validateOnMount
      enableReinitialize
      validationSchema={object({
        name: schema.requireString("Product Name"),
        images: schema.requireArray("Product Images").min(1),
        category_id: schema.requireString("Category"),
        cost_price: schema.requireNumber("Cost Price"),
        variations: schema.requireArray("Product Variations").min(1),
      })}
      initialValues={{
        name: data?.name ?? "",
        description: data?.description ?? "",
        images: data?.images ?? [],
        business_id: business_id,
        category_id: data?.category_id ?? categories[0]?.value ?? "",
        cost_price: data?.cost_price ?? 0,

        variations: data?.variations ?? [],
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
                        setOpen(
                          <AddCategoryModal
                            {...{ business_id, setClose }}
                            onAdd={(category: ProductCategories) => {
                              setCategories((prev) => {
                                return [
                                  ...prev,
                                  {
                                    label: category.name,
                                    value: category.id,
                                  },
                                ];
                              });
                            }}
                          />
                        );
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
                  step={0.01}
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
                              {values.variations.length > 1 && (
                                <div
                                  className="p-2 cursor-pointer bg-error rounded-lg"
                                  onClick={() => {
                                    const updatedVariants = [
                                      ...values.variations!,
                                    ];
                                    updatedVariants.splice(i, 1);

                                    if (variant.unique_id)
                                      deleteVariation(variant.unique_id);

                                    setFieldValue(
                                      "variations",
                                      updatedVariants
                                    );
                                  }}
                                >
                                  <Trash2 size={16} />
                                </div>
                              )}
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
                    return setFieldValue("variations", updatedVariants);
                  }

                  const newVariants = [...values.variations!];
                  newVariants.push(variants);

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
              {data ? "Save Changes" : "Create Product"}
            </Button>
          </div>

          {/* product images */}
          <ProductImages
            images={data?.images}
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
