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

const SupportDetailsForm = ({ business_id, data }: Props) => {
    const [image, setImage] = useState<string>();

    const handleSubmit = async (
        values: Omit<StorefrontFeatures, 'id' | 'business_id' | 'contact'>,
        actions: Pick<FormikHelpers<Omit<StorefrontFeatures, 'id'>>, "setSubmitting">
    ) => {
        await updateStorefrontFeatures(business_id, {
            ...values,
            business_id,
            contact: { ...data?.contact! }
        }).then(() => {
            toast.success('Support details updated')
        }).finally(() => {
            actions.setSubmitting(false)
        })
    }

    return (
        <Formik
            validateOnMount
            enableReinitialize
            initialValues={{
                support: {
                    deliveryPolicy: '',
                    paymentPolicy: '',
                    faq: '',
                    privacyPolicy: '',
                    UserAgreement: '',
                }
            }}
            onSubmit={(values, { setSubmitting }) => {
                console.log({
                    ...data,
                    ...values,
                    business_id,
                    contact: { ...data?.contact! }
                })

                handleSubmit(values, { setSubmitting })
            }}
        >
            {({ values, isValid, isSubmitting, setFieldValue, setFieldTouched, handleSubmit }) => (
                <Form className="flex flex-col gap-4">
                    <Field.Group
                        className="w-full"
                        name="support.deliveryPolicy"
                        label="Delivery Policy"
                    >
                        <Field.TextEditor
                            placeholder='Add your delivery policy here...'
                            content={values.support.deliveryPolicy}
                            onChange={(data: any) => {
                                setFieldValue("support.deliveryPolicy", data);
                            }}
                        />
                    </Field.Group>

                    <Field.Group
                        className="w-full"
                        name="support.paymentPolicy"
                        label="Payment Policy"
                    >
                        <Field.TextEditor
                            placeholder='Add your payment policy here...'
                            content={values.support.paymentPolicy}
                            onChange={(data: any) => {
                                setFieldValue("support.paymentPolicy", data);
                            }}
                        />
                    </Field.Group>

                    <Field.Group
                        className="w-full"
                        name="support.faq"
                        label="FAQs"
                    >
                        <Field.TextEditor
                            placeholder='Add your FAQs here...'
                            content={values.support.faq}
                            onChange={(data: any) => {
                                setFieldValue("support.faq", data);
                            }}
                        />
                    </Field.Group>

                    <Field.Group
                        className="w-full"
                        name="support.privacyPolicy"
                        label="Privacy Policy"
                    >
                        <Field.TextEditor
                            placeholder='Add your privacy policy here...'
                            content={values.support.privacyPolicy}
                            onChange={(data: any) => {
                                setFieldValue("support.privacyPolicy", data);
                            }}
                        />
                    </Field.Group>

                    <Field.Group
                        className="w-full"
                        name="support.UserAgreement"
                        label="User Agreement"
                    >
                        <Field.TextEditor
                            placeholder='Add your user agreement here.'
                            content={values.support.UserAgreement}
                            onChange={(data: any) => {
                                setFieldValue("support.UserAgreement", data);
                            }}
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
                        Save Changes
                    </Button>
                </Form>
            )}
        </Formik>
    )
}

export default SupportDetailsForm