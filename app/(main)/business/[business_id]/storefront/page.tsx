import { redirect } from 'next/navigation';
import { Form, Formik } from 'formik';
import React from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as Field from "@/components/global/Field";
import { getBusinessDetails, getExperimentalFeatures, getStorefrontFeatures } from '@/lib/queries'
import { routes } from '@/routes';
import HeroSectionForm from '@/components/forms/storefront/hero-section-form';
import clsx from 'clsx';
import ContactDetailsForm from '@/components/forms/storefront/contact-details-form';
import SupportDetailsForm from '@/components/forms/storefront/support-details-form';

type Props = { params: { business_id: string } };

const StorefrontPage = async ({ params: { business_id } }: Props) => {

    const business = await getBusinessDetails(business_id)

    const experimentalFeatures = await getExperimentalFeatures(business_id)
    const storefrontFeatures = await getStorefrontFeatures(business_id)

    return (
        <div className="flex flex-col w-full gap-4">
            <div className="flex gap-4">
                {business?.experimental_features &&
                    <Card className="flex flex-col gap-4">
                        <CardHeader>
                            <CardTitle className="text-center">Homepage Hero Section</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <HeroSectionForm {...{ business_id }} data={experimentalFeatures} />
                        </CardContent>
                    </Card>
                }

                <Card className="flex flex-col gap-4">
                    <CardHeader>
                        <CardTitle className="text-center">Contact</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ContactDetailsForm {...{ business_id }} data={storefrontFeatures} />
                    </CardContent>
                </Card>
            </div>

            <Card className={clsx("flex-col gap-4")}>
                <CardHeader>
                    <CardTitle className="text-center">Support</CardTitle>
                </CardHeader>
                <CardContent>
                    <SupportDetailsForm {...{ business_id }} data={storefrontFeatures} />
                </CardContent>
            </Card>
        </div>
    )
}

export default StorefrontPage