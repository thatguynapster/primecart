import OrderInvoice from "@/components/emails/product-order-invoice"
import React from 'react'

type Props = {}

const Invoice = () => {
    return (
        <OrderInvoice business={{
            name: "Primecart",
            location: {
                address: "k & G Bus Stop",
                city: "",
                country: "Ghana",
                country_code: "",
                latitude: 0,
                longitude: 0,
                region: ""
            }
        }} order={{
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
        }} user={{ name: "John Doe", }} />
    )
}

export default Invoice