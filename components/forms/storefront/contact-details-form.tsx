'use client'

import { ExperimentalFeatures, StorefrontFeatures } from '@prisma/client';
import { Form, Formik, FormikHelpers } from 'formik';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { object } from "yup";

import SingleFileUpload from '@/components/global/single-file-upload';
import { handleImageUpload } from '@/lib/file-handler';
import { Button } from '@/components/global/button';
import * as Field from "@/components/global/Field";
import { uploadFile } from '@/lib/s3-upload';
import * as schema from "@/lib/schema";
import { updateExperimentalFeatures, updateStorefrontFeatures } from '@/lib/queries';

type Props = { business_id: string, data?: Partial<StorefrontFeatures> | null }

const ContactDetailsForm = ({ business_id, data }: Props) => {
    const handleSubmit = async (
        values: Omit<StorefrontFeatures, 'id' | 'business_id' | 'support'>,
        actions: Pick<FormikHelpers<Omit<StorefrontFeatures, 'id'>>, "setSubmitting">
    ) => {
        const initData = {
            support: {
                deliveryPolicy: "",
                paymentPolicy: "",
                faq: "",
                privacyPolicy: "",
                UserAgreement: "",
            },
            contact: {
                email: "",
                phone: "",
                socials: {
                    facebook: "",
                    instagram: "",
                    twitter: "",
                },
            },
        };


        await updateStorefrontFeatures(business_id, {
            ...values,
            business_id,
            support: !data ? { ...initData.support } : { ...data?.support! }
        })
        toast.success('Contacts updated')
        actions.setSubmitting(false)
    }

    return (
        <Formik
            validateOnMount
            enableReinitialize
            initialValues={{
                contact: {
                    phone: data?.contact?.phone ?? '',
                    email: data?.contact?.email ?? '',
                    socials: {
                        facebook: data?.contact?.socials.facebook ?? '',
                        instagram: data?.contact?.socials.instagram ?? '',
                        twitter: data?.contact?.socials.twitter ?? '',
                    }
                }
            }}
            onSubmit={(values, { setSubmitting }) => {
                console.log(values)

                handleSubmit(values, { setSubmitting })
            }}
        >
            {({ values, isValid, isSubmitting, setFieldValue, setFieldTouched, handleSubmit }) => (
                <Form className="flex flex-col gap-4">

                    <div className="flex flex-col lg:flex-row gap-4">
                        <Field.Group
                            className="w-full"
                            name="contact.email"
                            label="Email"
                        >
                            <Field.Input
                                as="input"
                                name="contact.email"
                                type="text"
                                value={values.contact.email}
                                placeholder="Eg: someone@primecart.app"
                            />
                        </Field.Group>

                        <Field.Group
                            className="w-full"
                            name="contact.phone"
                            label="Phone Number"
                        >
                            <Field.Phone
                                name="contact.phone"
                                value={values.contact.phone?.split("+")?.pop() ?? ''}
                                {...{ setFieldValue, setFieldTouched }}
                                placeholder="020 000 0000"
                            />

                        </Field.Group>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4">
                        <Field.Group
                            className="w-full"
                            name="contact.socials.facebook"
                            label="Facebook"
                        >
                            <Field.Input
                                as="input"
                                name="contact.socials.facebook"
                                type="text"
                                value={values.contact.socials.facebook}
                                placeholder="Eg: https://www.facebook.com/username/"
                            />
                        </Field.Group>

                        <Field.Group
                            className="w-full"
                            name="contact.socials.instagram"
                            label="Instagram"
                        >
                            <Field.Input
                                as="input"
                                name="contact.socials.instagram"
                                type="text"
                                value={values.contact.socials.instagram}
                                placeholder="Eg: https://www.instagram.com/username/"
                            />
                        </Field.Group>

                        <Field.Group
                            className="w-full"
                            name="contact.socials.twitter"
                            label="Twitter"
                        >
                            <Field.Input
                                as="input"
                                name="contact.socials.twitter"
                                type="text"
                                value={values.contact.socials.twitter}
                                placeholder="Eg: https://x.com/username"
                            />
                        </Field.Group>
                    </div>

                    <Button
                        className="w-max"
                        type="submit"
                        disabled={!isValid}
                        onClick={() => {
                            handleSubmit();
                        }}
                        {...{ isSubmitting }}
                    >
                        Save Changes
                    </Button>
                </Form>
            )}
        </Formik>
    )
}

export default ContactDetailsForm