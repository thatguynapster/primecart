import PrimeCartOrderPaymentEmail from "@/components/emails/order-payment"
import React from 'react'

type Props = {}

const OrderPaymentPage = (props: Props) => {
    return (
        <PrimeCartOrderPaymentEmail
            business={
                {
                    name: "Primecart Shop",
                    email: "info@primecart.app",
                    location: {
                        address: "K & G Bus Stop",
                        city: "",
                        country: "Ghana",
                        country_code: "",
                        latitude: 0,
                        longitude: 0,
                        region: ""
                    }
                }
            }
            order={
                {
                    invoiceId: "INV-123456",
                    order: {
                        id: '123456',
                        amount: 123.45,
                        createdAt: new Date(),
                    },
                    products: [
                        {
                            name: "Product 1",
                            quantity: 2,
                            amount: 50.00,
                        },
                        {
                            name: "Product 2",
                            quantity: 1,
                            amount: 23.45,
                        }
                    ]
                }
            }
            user={
                { name: "John Doe" }
            }
        />
    )
}

export default OrderPaymentPage