import * as React from "react";
import {
    Body,
    Button,
    Container,
    Head,
    Html,
    Img,
    Preview,
    Section,
    Text,
} from "@react-email/components";
import { Business, Customer, ProductOrders, Products } from "@prisma/client";
import { format } from "date-fns";
import { parseCurrency } from "@/lib/utils";


interface OrderPaymentEmailProps {
    business: Pick<Business, "name" | "email" | "location">;
    order: {
        invoiceId: string;
        order: Pick<ProductOrders, 'amount' | 'id' | 'createdAt'>;
        products: (Pick<Products, 'name'> & { quantity: number; amount: number; })[];
    }
    user: Pick<Customer, 'name'>;
}

export const PrimeCartOrderPaymentEmail = ({
    business,
    order: {
        invoiceId,
        order,
        products,
    },
    user,
}: OrderPaymentEmailProps) => {
    return (
        // <Html>
        //     <Head />
        //     <Preview>
        //         Payment confirmed for your order with {business.name} ✅
        //     </Preview>
        //     <Body style={main}>
        //         <Container style={container}>
        //             {/* Logo */}
        //             <Section style={header}>
        //                 <Img
        //                     src="https://primecart.s3.us-east-2.amazonaws.com/primecart-icon.png"
        //                     width="120"
        //                     alt="PrimeCart Logo"
        //                     style={{ margin: "0 auto" }}
        //                 />
        //             </Section>

        //             {/* Main Content */}
        //             <Section style={content}>
        //                 <Text style={h1}>Payment Confirmed 🎉</Text>
        //                 <Text style={paragraph}>
        //                     Hi {user.name}, thank you for your payment! Your order with{" "}
        //                     <strong>{business.name}</strong> has been successfully processed
        //                     and is now being prepared.
        //                 </Text>

        //                 {/* Order Summary */}
        //                 <Section style={orderBox}>
        //                     <Text style={orderTitle}>Order Summary</Text>
        //                     <Text style={orderDetail}>
        //                         Order ID: <strong>{order.id}</strong>
        //                     </Text>
        //                     <Text style={orderDetail}>
        //                         Invoice ID: <strong>{invoiceId}</strong>
        //                     </Text>
        //                     <Text style={orderDetail}>
        //                         Order Date: {format(order.createdAt, "do MMM, yyyy @ h:mma")}
        //                     </Text>
        //                     <hr style={{ border: "1px solid #e5e7eb", margin: "15px 0" }} />

        //                     {/* {products.map((item, index) => (
        //                         <Text style={orderItem} key={index}>
        //                             {item.quantity} x {item.name} — {parseCurrency(item.amount)}
        //                         </Text>
        //                     ))} */}

        //                     <table style={table}>
        //                         <thead>
        //                             <tr>
        //                                 <th style={tableHeader}>Product</th>
        //                                 <th style={{ ...tableHeader, textAlign: "right" }}>Unit Price</th>
        //                                 <th style={{ ...tableHeader, textAlign: "center" }}>Quantity</th>
        //                                 <th style={{ ...tableHeader, textAlign: "right" }}>Price</th>
        //                             </tr>
        //                         </thead>
        //                         <tbody>
        //                             {products.map((product, index) => (
        //                                 <tr key={index}>
        //                                     <td style={tableCell}>{product.name}</td>
        //                                     <td style={{ ...tableCell, textAlign: "right" }}>{parseCurrency(product.amount)}</td>
        //                                     <td style={{ ...tableCell, textAlign: "center" }}>{product.quantity}</td>
        //                                     <td style={{
        //                                         ...tableCell, textAlign: "right"
        //                                     }}>{parseCurrency(product.amount * product.quantity)}</td>
        //                                 </tr>
        //                             ))}
        //                         </tbody>
        //                     </table>

        //                     {/* <hr style={{ border: "1px solid #e5e7eb", margin: "15px 0" }} />
        //                     <Text style={orderTotal}>
        //                         Total Paid: {parseCurrency(order.amount)}
        //                     </Text> */}

        //                     <table style={table}>
        //                         <tbody>
        //                             {/* <tr>
        //                                                 <td style={tableCell}>Sale Discount</td>
        //                                                 <td style={{ ...tableCell, textAlign: "right" }}>- $4.39 USD</td>
        //                                             </tr> */}
        //                             <tr>
        //                                 <td style={totalCell}>TOTAL:</td>
        //                                 <td style={{ ...totalCell, textAlign: "right" }}>{parseCurrency(order.amount)}</td>
        //                             </tr>
        //                         </tbody>
        //                     </table>
        //                 </Section>

        //                 {/* CTA */}
        //                 {/* <Section style={{ textAlign: "center", margin: "30px 0" }}>
        //                     <Button
        //                         style={button}
        //                         href={`https://primecart.app/orders/${order.id}`}
        //                     >
        //                         View Your Order
        //                     </Button>
        //                 </Section> */}

        //                 <Text style={paragraph}>
        //                     You'll receive another update once your order is shipped from{" "}
        //                     {business.location.address}.
        //                     If you have any questions, feel free to reach out to us at{" "}
        //                     <a href={`mailto:${business.email}`} style={link}>
        //                         {business.email}
        //                     </a>.
        //                 </Text>

        //                 <Text style={paragraph}>
        //                     Thanks again for choosing {business.name}!
        //                     <br />
        //                     <br />
        //                     Cheers,
        //                     <br />
        //                     The PrimeCart Team
        //                 </Text>
        //             </Section>

        //             {/* Footer */}
        //             <Section style={footer}>
        //                 <Text style={footerText}>
        //                     You’re receiving this email because you placed an order on{" "}
        //                     {business.name}.
        //                 </Text>
        //                 {/* <Text style={footerText}>
        //                     <a href="#" style={link}>
        //                         Unsubscribe
        //                     </a>{" "}
        //                     |{" "}
        //                     <a href="#" style={link}>
        //                         Manage Preferences
        //                     </a>
        //                 </Text> */}
        //             </Section>
        //         </Container>
        //     </Body>
        // </Html>
        <Html>
            <Head />
            <Preview>
                Payment confirmed for your order with {business.name} ✅
            </Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Logo */}
                    <Section style={header}>
                        <Img
                            src="https://primecart.s3.us-east-2.amazonaws.com/primecart-icon.png"
                            width="120"
                            alt="PrimeCart Logo"
                            style={{ margin: "0 auto" }}
                        />
                    </Section>

                    {/* Main Content */}
                    <Section style={content}>
                        <Text style={h1}>Payment Confirmed 🎉</Text>
                        <Text style={paragraph}>
                            Hi {user.name}, thank you for your payment! Your order with{" "}
                            <strong>{business.name}</strong> has been successfully processed
                            and is now being prepared.
                        </Text>

                        {/* Order Summary */}
                        <Section style={orderBox}>
                            <Text style={orderTitle}>Order Summary</Text>
                            <Text style={orderDetail}>
                                Order ID: <strong>{order.id}</strong>
                            </Text>
                            <Text style={orderDetail}>
                                Invoice ID: <strong>{invoiceId}</strong>
                            </Text>
                            <Text style={orderDetail}>
                                Order Date: {new Date(order.createdAt).toLocaleDateString()}
                            </Text>
                            <hr style={{ border: "1px solid #e5e7eb", margin: "15px 0" }} />

                            {products.map((item, index) => (
                                <Text style={orderItem} key={index}>
                                    {item.quantity} × {item.name} — {parseCurrency(item.amount)}
                                </Text>
                            ))}

                            <hr style={{ border: "1px solid #e5e7eb", margin: "15px 0" }} />
                            <Text style={orderTotal}>
                                Total Paid: {parseCurrency(order.amount)}
                            </Text>
                        </Section>

                        {/* CTA */}
                        <Section style={{ textAlign: "center", margin: "30px 0" }}>
                            <Button
                                style={button}
                                href={`https://primecart.com/orders/${order.id}`}
                            >
                                View Your Order
                            </Button>
                        </Section>

                        <Text style={paragraph}>
                            You’ll receive another update once your order is shipped from{" "}
                            {business.location.address}.
                            If you have any questions, feel free to reach out to us at{" "}
                            <a href={`mailto:${business.email}`} style={link}>
                                {business.email}
                            </a>.
                        </Text>

                        <Text style={paragraph}>
                            Thanks again for choosing {business.name}!
                            <br />
                            <br />
                            Cheers,
                            The PrimeCart Team
                        </Text>
                    </Section>

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            You’re receiving this email because you placed an order on{" "}
                            {business.name}.
                        </Text>
                        {/* <Text style={footerText}>
                            <a href="#" style={link}>
                                Unsubscribe
                            </a>{" "}
                            |{" "}
                            <a href="#" style={link}>
                                Manage Preferences
                            </a>
                        </Text> */}
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

// Styles
const main = {
    // backgroundColor: "#f9fafb",
    fontFamily: "Arial, Helvetica, sans-serif",
};

const container = {
    maxWidth: "600px",
    margin: "0 auto",
    // backgroundColor: "#ffffff",
    borderRadius: "8px",
    overflow: "hidden",
    // boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
};

const header = {
    // backgroundColor: "#4f46e5",
    padding: "20px",
    textAlign: "center" as const,
    margin: "0 auto"
};


const content = {
    padding: "30px",
};

const h1 = {
    // color: "#111827",
    fontSize: "22px",
    fontWeight: "bold",
};

const paragraph = {
    fontSize: "16px",
    lineHeight: "24px",
    margin: "16px 0",
    color: "#333333",
};

const button = {
    display: "inline-block",
    padding: "12px 24px",
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "bold",
};

const link = {
    color: "#4f46e5",
    textDecoration: "none",
};

const orderBox = {
    // backgroundColor: "#f9fafb",
    padding: "20px",
    borderRadius: "8px",
    margin: "20px 0",
};

const orderTitle = {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "10px",
};

const orderDetail = {
    fontSize: "15px",
    margin: "5px 0",
    color: "#374151",
};

const orderItem = {
    fontSize: "15px",
    margin: "4px 0",
    color: "#111827",
};

const table = {
    width: "100%",
    borderCollapse: "collapse" as const,
};

const tableHeader = {
    padding: "8px",
    borderBottom: "1px solid #ddd",
    fontWeight: "bold",
    textAlign: "left" as const,
};

const tableCell = {
    padding: "8px",
    borderBottom: "1px solid #eee",
};

const totalCell = {
    padding: "8px",
    fontWeight: "bold",
};

const orderTotal = {
    fontSize: "16px",
    fontWeight: "bold",
    marginTop: "10px",
};

const footer = {
    backgroundColor: "#f3f4f6",
    padding: "20px",
    textAlign: "center" as const,
};

const footerText = {
    fontSize: "14px",
    color: "#6b7280",
    margin: "5px 0",
};

export default PrimeCartOrderPaymentEmail;
