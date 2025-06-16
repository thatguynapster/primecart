"use client";

import { useParams, useRouter } from "next/navigation";
import { Form, Formik } from "formik";
import React from "react";

import { toggleExperimentalFeatures } from "@/lib/queries";
import * as Field from "@/components/global/Field";
import { Card, CardContent } from "../ui/card";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

type Props = { enabled: boolean };

const ExperimentalFeatures = ({ enabled = false }: Props) => {
  const params = useParams<{ business_id: string }>()
  const router = useRouter()

  return (
    <Card className="w-full lg:max-w-80 h-fit flex flex-col gap-4">
      <CardContent>
        <Formik
          validateOnMount
          enableReinitialize
          initialValues={{
            experimental_features: enabled
          }}
          onSubmit={async (values, { setSubmitting }) => {
            await toggleExperimentalFeatures(params.business_id, values);
            router.refresh()
          }}
        >
          {({ values, isValid, isSubmitting, setFieldValue, handleSubmit }) => (
            <Form className="flex flex-col gap-4">
              <Field.Group
                className="w-full"
                name="experimental_features"
                required
              >
                <div className="flex items-center space-x-4">
                  <Switch
                    id="experimental_features"
                    checked={values.experimental_features}
                    onCheckedChange={(value) => {
                      setFieldValue('experimental_features', value)
                      handleSubmit()
                    }}
                  />
                  <Label htmlFor="experimental_features">Enable experimental features</Label>
                </div>
              </Field.Group>
            </Form>
          )}
        </Formik>
      </CardContent>
    </Card>
  );
};

export default ExperimentalFeatures;
