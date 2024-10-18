"use client";

import { Form, Formik, FormikHelpers } from "formik";
import { object } from "yup";
import React, { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import * as Field from "@/components/global/Field";
import * as schema from "@/lib/schema";
import SingleFileUpload from "../global/single-file-upload";
import { deleteFile, handleImageUpload } from "@/lib/file-handler";
import { Button } from "../global/button";
import { Users } from "@prisma/client";
import Image from "next/image";
import clsx from "clsx";

type Props = { user?: Users | null };

const UserDetails = ({ user }: Props) => {
  return (
    <Card className="w-full lg:max-w-80 h-fit">
      <CardHeader>
        <CardTitle className="text-center">User Details</CardTitle>
      </CardHeader>
      {user ? (
        <CardContent>
          <Formik
            validateOnMount
            enableReinitialize
            validationSchema={object({
              avatar: schema.requireString("Profile Image"),
              first_name: schema.requireString("First Name"),
              last_name: schema.requireString("Last Name"),
              email: schema.requireEmail("Email"),
            })}
            initialValues={{
              avatar: user.avatar ?? "",
              first_name: user.first_name ?? "",
              last_name: user.last_name ?? "",
              email: user.email ?? "",
            }}
            onSubmit={() => {}}
          >
            {({ values, isValid, isSubmitting, handleSubmit }) => (
              <Form className="flex flex-col gap-4">
                <Field.Group
                  className="w-full"
                  name="avatar"
                  label="Profile picture"
                  required
                >
                  <div
                    className={clsx(
                      "relative w-20 h-20 border-2 border-dashed rounded-xl mx-auto m-4",
                      "flex items-center justify-center group",
                      "bg-light border-dark",
                      "dark:bg-dark dark:border-light"
                    )}
                  >
                    <Image
                      src={values.avatar}
                      className="rounded-xl"
                      alt="Business Logo"
                      fill
                      sizes="(max-width: 1200px) 100vw, (max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                </Field.Group>

                <Field.Group
                  className="w-full"
                  name="first_name"
                  label="First Name"
                  disabled
                >
                  <Field.Input
                    as="input"
                    name="first_name"
                    type="text"
                    value={values.first_name}
                    placeholder="Bleeder Crafts"
                  />
                </Field.Group>

                <Field.Group
                  className="w-full"
                  name="last_name"
                  label="Last Name"
                  disabled
                >
                  <Field.Input
                    as="input"
                    name="last_name"
                    type="text"
                    value={values.last_name}
                    placeholder="Bleeder Crafts"
                  />
                </Field.Group>

                <Field.Group
                  className="w-full"
                  name="email"
                  label="Email"
                  disabled
                >
                  <Field.Input
                    as="input"
                    name="email"
                    type="email"
                    value={values.email}
                    placeholder="Bleeder Crafts"
                  />
                </Field.Group>
              </Form>
            )}
          </Formik>
        </CardContent>
      ) : (
        <>No user data</>
      )}
    </Card>
  );
};

export default UserDetails;
