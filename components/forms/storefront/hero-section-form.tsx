'use client'

import { ExperimentalFeatures } from '@prisma/client';
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
import { updateExperimentalFeatures } from '@/lib/queries';

type Props = { business_id: string, data?: Partial<ExperimentalFeatures> | null }

const HeroSectionForm = ({ business_id, data }: Props) => {
    const [image, setImage] = useState<string>();

    const handleSubmit = async (
        values: Omit<ExperimentalFeatures, 'id' | 'business_id'>,
        actions: Pick<FormikHelpers<Omit<ExperimentalFeatures, 'id'>>, "setSubmitting">
    ) => {
        await updateExperimentalFeatures(business_id, { ...values, business_id })
        toast.success('Hero section updated')
        actions.setSubmitting(false)
    }

    return (
        <Formik
            validateOnMount
            enableReinitialize
            validationSchema={object({
                heroSection: object().shape({
                    backgroundImage: schema.requireString("Hero Background"),
                    title: schema.requireString('Title'),
                    subText: schema.requireString('Sub text')
                })
            })}
            initialValues={{
                heroSection: {
                    backgroundImage: data?.heroSection?.backgroundImage ?? '',
                    title: data?.heroSection?.title ?? '',
                    subText: data?.heroSection?.subText ?? '',
                    cta: {
                        text: data?.heroSection?.cta.text ?? '',
                        link: data?.heroSection?.cta.link ?? ''
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
                    <Field.Group
                        className="w-full"
                        name="heroSection.backgroundImage"
                        label="Background Image"
                        required
                    >
                        <SingleFileUpload
                            value={values.heroSection.backgroundImage}
                            name="heroSection.backgroundImage"
                            type={"image"}
                            onValueChanged={async (file: File) => {
                                const uploaded_file = await uploadFile(file, "media");
                                if (uploaded_file.url) {
                                    setFieldValue('heroSection.backgroundImage', uploaded_file.url)
                                    setImage(uploaded_file.url);
                                }
                            }}
                            deleteFile={async () => {
                                setFieldValue('heroSection.backgroundImage', '')

                                toast("File deleted");
                            }}
                            {...{ setFieldTouched }}
                        />
                    </Field.Group>

                    <div className="flex flex-col lg:flex-row gap-4">
                        <Field.Group
                            className="w-full"
                            name="heroSection.title"
                            label="Title"
                            required
                        >
                            <Field.Input
                                as="input"
                                name="heroSection.title"
                                type="text"
                                value={values.heroSection.title}
                                placeholder="Eg: Summer Collection 2025"
                            />
                        </Field.Group>

                        <Field.Group
                            className="w-full"
                            name="heroSection.subText"
                            label="Sub text"
                            required
                        >
                            <Field.Input
                                as="input"
                                name="heroSection.subText"
                                type="text"
                                value={values.heroSection.subText}
                                placeholder="Eg: Embrace the season with our latest styles crafted for modern elegance."
                            />
                        </Field.Group>
                    </div>

                    <Field.Group
                        className="w-full"
                        name="heroSection.cta"
                        label="Call To Action"
                    >
                        <div className="flex flex-col lg:flex-row gap-4">
                            <Field.Input
                                as="input"
                                name="heroSection.cta.text"
                                type="text"
                                value={values.heroSection.cta.text}
                                placeholder="Eg: Call To Action Text"
                            />
                            <Field.Input
                                as="input"
                                name="heroSection.cta.link"
                                type="text"
                                value={values.heroSection.cta.link}
                                placeholder="Eg: Call To Action Link"
                            />
                        </div>
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

export default HeroSectionForm