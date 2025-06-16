'use client'

import { Form, Formik, FormikHelpers } from 'formik'
import { object } from 'yup'
import React, { useEffect, useState } from 'react'

import { useModal } from '@/providers/modal-provider'
import * as Field from "@/components/global/Field";
import CustomModal from '../global/custom-modal'
import { parseCurrency } from '@/lib/utils'
import { Button } from '../global/button'
import * as schema from "@/lib/schema";
import { useParams } from 'next/navigation'
import { getPaymentDetails, initiateWithdrawal } from '@/lib/queries'
import toast from 'react-hot-toast'
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Payment } from '@prisma/client'

type Props = { max_amount: number }

const WithdrawButton = ({ max_amount }: Props) => {
    const params = useParams<{ business_id: string }>()
    const { setOpen, setClose } = useModal();
    const [payment, setPayment] = useState<Payment | null>(null)

    const fetchPaymentDetails = async () => {
        try {
            let payment = await getPaymentDetails(params.business_id);
            setPayment(payment)
        } catch (error) {
            console.log(error);
        }
    };

    const handleWithdrawal = async ({ amount, preferred_channel }: {
        amount: number, preferred_channel: string
    }, actions: Pick<FormikHelpers<{ amount: number, preferred_channel: string }>, "setSubmitting">) => {
        try {
            await initiateWithdrawal({
                business_id: params.business_id, amount: Number(amount),
                meta_data: { preferred_channel }
            })
        } catch (error: any) {
            toast.error(error.message)
        }

        actions.setSubmitting(false)
        setClose()
    }

    useEffect(() => {
        fetchPaymentDetails()
    }, [])

    return (
        <Button variant="outline" onClick={() => {
            setOpen(
                <CustomModal title="Withdraw funds" className="max-w-96">
                    <p>Available balance: {parseCurrency(max_amount)}</p>

                    <Formik
                        validateOnMount
                        enableReinitialize
                        validationSchema={object({
                            amount: schema.requireNumber('Withdrawal amount'),
                            preferred_channel: schema.requireString('Provider')
                        })}
                        initialValues={{
                            amount: 1,
                            preferred_channel: 'MOMO'
                        }}
                        onSubmit={(values, { setSubmitting }) => {
                            console.log(values)
                            if (values.amount > 50) {
                                handleWithdrawal(values, { setSubmitting })
                            }
                        }}
                    >
                        {({ values, isValid, isSubmitting, setFieldValue, handleSubmit }) => (
                            <Form className="flex flex-col gap-6">
                                <div className="flex items-start gap-2">
                                    <Field.Group
                                        className="w-full"
                                        name="amount"
                                    >
                                        <Field.Input
                                            className="w-full"
                                            as="input"
                                            name="amount"
                                            type="number"
                                            min={1}
                                            value={values.amount}
                                        />
                                    </Field.Group>

                                    <Button
                                        className="w-max"
                                        variant={'outline'}
                                        type="button"
                                        onClick={() => { setFieldValue('amount', max_amount.toFixed(2)) }}
                                    >
                                        Max
                                    </Button>
                                </div>

                                <Field.Group
                                    className="w-full"
                                    name="name"
                                    label="Where should we send your withdrawal?"
                                    required
                                >
                                    <RadioGroup defaultValue="MOMO" onValueChange={(value) => {
                                        console.log(value)
                                        setFieldValue('preferred_channel', value)
                                    }}>
                                        {payment?.momo &&
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="MOMO" id="MOMO" />
                                                <Label htmlFor="MOMO">{`Mobile money account ending ${payment.momo.account_number.slice(-3)}`}</Label>
                                            </div>
                                        }

                                        {payment?.bank &&
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="BANK" id="BANK" />
                                                <Label htmlFor="BANK">Bank account ending in
                                                    {payment.bank.account_number.slice(-4)}
                                                </Label>
                                            </div>
                                        }
                                    </RadioGroup>
                                </Field.Group>

                                <Button
                                    className="w-1/2 mx-auto"
                                    type="button"
                                    disabled={(values.amount < 50) || isSubmitting}
                                    {...{ isSubmitting }}
                                    onClick={() => { handleSubmit() }}
                                > Withdraw </Button>
                            </Form>
                        )}
                    </Formik>
                </CustomModal>
            );
        }}> Withdraw </Button>
    )
}

export default WithdrawButton