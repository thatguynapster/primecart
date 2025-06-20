"use client";

import { Form, Formik } from "formik";
import toast from "react-hot-toast";
import { object } from "yup";
import React, { useState } from "react";
import { v4 } from "uuid";

import MultipleFileUpload from "@/components/global/multi-file-upload";
import CustomModal from "@/components/global/custom-modal";
import { Button } from "@/components/global/button";
import * as Field from "@/components/global/Field";
import { ProductCategories } from "@prisma/client";
import { upsertCategory } from "@/lib/queries";
import * as schema from "@/lib/schema";
import { uploadFile } from "@/lib/s3-upload";

type Props = {
  business_id: string;
  onAdd: (category: ProductCategories) => void;
  setClose: () => void;
};

interface FormData {
  name: string;
  unique_id?: string;
  description: string;
  previewImage: string
}

const AddCategoryModal = ({ business_id, onAdd, setClose }: Props) => {
  const [image, setImage] = useState<string>();

  const handleAddCategory = async (data: FormData) => {
    try {
      const category = (await upsertCategory({
        ...data,
        unique_id: v4(),
        business_id,
      })) as ProductCategories;
      onAdd(category);
      toast.success(`Category ${data.name} added successfully`);

      setImage(undefined)
      setClose();
    } catch (error) {
      console.log(error);
      throw new Error("Failed to add category", { cause: error });
    }
  };

  return (
    <CustomModal title="Add Category" className="max-w-96">
      <div className="flex flex-col gap-4">
        <Formik
          validateOnMount
          enableReinitialize
          validationSchema={object({
            name: schema.requireString("Category Name"),
          })}
          initialValues={{
            name: "",
            description: "",
            previewImage: '',
          }}
          onSubmit={(values, { setSubmitting }) => {
            setSubmitting(true);
            handleAddCategory(values);
          }}
        >
          {({ values, isValid, isSubmitting, handleSubmit, setFieldValue }) => (
            <Form className="flex flex-col gap-4 w-full">
              <Field.Group className="w-full" name="name" label="Name" required>
                <Field.Input
                  as="input"
                  name="name"
                  type="text"
                  value={values.name}
                  placeholder="Eg: Mobile Phones"
                />
              </Field.Group>

              <Field.Group
                className="w-full"
                name="description"
                label="Description"
              >
                <Field.Input
                  as="textarea"
                  rows={5}
                  name="description"
                  type="text"
                  value={values.description}
                  placeholder="Enter category description"
                />
              </Field.Group>

              <Field.Group
                className="w-full"
                name="previewImage"
                label="Preview Image"
              >
                <MultipleFileUpload
                  files={image ? [image] : []}
                  name="previewImage"
                  type={"image"}
                  limit={1}
                  onValueChanged={async (file: File) => {
                    const uploaded_file = await uploadFile(file, "categories");
                    if (uploaded_file.url) {
                      setFieldValue('previewImage', uploaded_file.url)
                      setImage(uploaded_file.url);
                    }

                  }}
                  deleteFile={async (id: string) => {
                    setImage('');

                    toast("File deleted");
                  }}
                />
              </Field.Group>

              <div className="flex gap-4 ">
                <Button
                  className="w-max"
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setClose();
                  }}
                >
                  Cancel
                </Button>

                <Button
                  className="w-max"
                  disabled={!isValid}
                  type="submit"
                  onClick={() => {
                    handleSubmit();
                  }}
                  {...{ isSubmitting }}
                >
                  Create Category
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </CustomModal>
  );
};

export default AddCategoryModal;
