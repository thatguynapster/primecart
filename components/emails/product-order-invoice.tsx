import { Html } from "@react-email/html";
import { Head } from "@react-email/head";
import { Container } from "@react-email/container";
import { Text } from "@react-email/text";
import { Section } from "@react-email/section";
import { Column } from "@react-email/column";
import { Row } from "@react-email/row";
import { Hr } from "@react-email/hr";
import { Business, Customer, ProductOrders, Products, Users } from "@prisma/client";
import { parseCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface InvoiceEmailProps {
    business: Pick<Business, "name" | "location">;
    order: {
        invoiceId: string;
        order: Pick<ProductOrders, 'amount' | 'id' | 'createdAt'>;
        products: (Pick<Products, 'name'> & { quantity: number; amount: number; })[];
    }
    user: Pick<Customer, 'name'>;
}

const OrderInvoice = ({
    business,
    order: {
        invoiceId,
        order,
        products,
    },
    user,
}: InvoiceEmailProps) => (
    <Html>
        <Head />
        <Container style={container}>
            <Section style={header}>
                <Text style={heading}>Thank You.</Text>
                <Text style={subHeading}>Hi {user.name.split(' ')[0]}!</Text>
                <Text style={paragraph}>Thank you for your purchase!</Text>
            </Section>

            <Text style={label}>INVOICE ID: {invoiceId}</Text>

            <Section style={section}>
                <Text style={sectionTitle}>YOUR ORDER INFORMATION:</Text>
                <Row>
                    <Column style={infoColumn}>
                        <Text style={infoLabel}>Order ID:</Text>
                    </Column>
                    <Column>
                        <Text style={infoValue}>{order.id.toString().slice(-6).toUpperCase()}</Text>
                    </Column>
                </Row>
                <Row>
                    <Column style={infoColumn}>
                        <Text style={infoLabel}>Bill To:</Text>
                    </Column>
                    <Column>
                        <Text style={infoValue}>{user.name}</Text>
                    </Column>
                </Row>
                <Row>
                    <Column style={infoColumn}>
                        <Text style={infoLabel}>Order Date:</Text>
                    </Column>
                    <Column>
                        <Text style={infoValue}>{format(order.createdAt, "do MMM, yyyy @ h:mma")}</Text>
                    </Column>
                </Row>
                <Row>
                    <Column style={infoColumn}>
                        <Text style={infoLabel}>Source:</Text>
                    </Column>
                    <Column>
                        <Text style={infoValue}>{business.name}</Text>
                    </Column>
                </Row>
            </Section>

            <Section style={section}>
                <Text style={sectionTitle}>HERE'S WHAT YOU ORDERED:</Text>
                <table style={table}>
                    <thead>
                        <tr>
                            <th style={tableHeader}>Product</th>
                            <th style={{ ...tableHeader, textAlign: "right" }}>Unit Price</th>
                            <th style={{ ...tableHeader, textAlign: "center" }}>Quantity</th>
                            <th style={{ ...tableHeader, textAlign: "right" }}>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product, index) => (
                            <tr key={index}>
                                <td style={tableCell}>{product.name}</td>
                                <td style={{ ...tableCell, textAlign: "right" }}>{parseCurrency(product.amount)}</td>
                                <td style={{ ...tableCell, textAlign: "center" }}>{product.quantity}</td>
                                <td style={{
                                    ...tableCell, textAlign: "right"
                                }}>{parseCurrency(product.amount * product.quantity)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Section>

            <Section style={section}>
                {/* <Text style={sectionTitle}>Discounts:</Text> */}
                <table style={table}>
                    <tbody>
                        {/* <tr>
                            <td style={tableCell}>Sale Discount</td>
                            <td style={{ ...tableCell, textAlign: "right" }}>- $4.39 USD</td>
                        </tr> */}
                        <tr>
                            <td style={totalCell}>TOTAL:</td>
                            <td style={{ ...totalCell, textAlign: "right" }}>{parseCurrency(order.amount)}</td>
                        </tr>
                    </tbody>
                </table>
            </Section>

            {/* <Section style={instructions}>
                <Text style={paragraph}>
                    Please keep a copy of this receipt for your records.
                </Text>
                <Text style={link}>View your purchase history</Text>
                <Text style={link}>
                    View your <strong>EBS</strong> Records balance
                </Text>
            </Section> */}

            {/* <Section style={policy}>
                <Text style={policyText}>
                    Games and apps purchased on the <strong>EBS</strong> Games Store are
                    eligible for a refund within 14 days of purchase (or 14 days after
                    release for pre-purchased) if they have less than 2 hours of runtime,
                    unless otherwise stated on their <strong>EBS</strong> Games Store
                    product page. Often that includes virtual memory or other commissions
                    are market understandable and are not eligible for refund. Most in-app
                    purchases are non-refundable. See our refund policy for more
                    information.
                </Text>
            </Section> */}

            <Hr style={divider} />

            <Section style={footer}>
                <Text style={footerTitle}>{business.name}</Text>
                <Text style={footerText}>{business.location.address}, {business.location.country}</Text>
                {/* <Text style={footerText}>
                    Bates Tax Registration Number: CHE-282 130 809
                </Text> */}

                {/* <Text style={helpLink}>Start Help? No preparation...</Text> */}

                {/* <Text style={copyright}>
                    © 2016 <strong>EBS</strong> Games, Inc. All rights reserved.{" "}
                    <strong>EBS</strong> <strong>EBS</strong> Games, the{" "}
                    <strong>EBS</strong> Games logo, United States Export, the United
                    Kingdom logo, <strong>EBS</strong> Games Store, and the{" "}
                    <strong>EBS</strong> Games Trading are trademarks or proprietary
                    trademarks of <strong>EBS</strong> Games, Inc. In the USA and
                    elsewhere. All other trademarks can be accessed at their respective
                    website.
                </Text> */}

                {/* <Row>
                    <Column>
                        <Text style={footerLink}>Terms of Service</Text>
                    </Column>
                    <Column>
                        <Text style={footerLink}>Privacy Policy</Text>
                    </Column>
                </Row> */}
            </Section>
        </Container>
    </Html>
);

// Styles
const container = {
    maxWidth: "600px",
    margin: "2rem auto",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    color: "#333",
};

const header = {
    marginBottom: "30px",
};

const heading = {
    textAlign: "center" as const,
    fontSize: "36px",
    fontWeight: "bold",
    margin: "0 0 10px",
};

const subHeading = {
    fontSize: "24px",
    fontWeight: "600",
    margin: "0 0 10px",
};

const paragraph = {
    fontSize: "18px",
    lineHeight: "1.5",
    margin: "0 0 20px",
};

const label = {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "20px",
    display: "block",
};

const section = {
    marginBottom: "30px",
};

const sectionTitle = {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "15px",
};

const infoColumn = {
    width: "100px",
};

const infoLabel = {
    fontWeight: "bold",
    margin: "0 0 5px",
};

const infoValue = {
    margin: "0 0 5px",
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

const instructions = {
    marginBottom: "30px",
};

const link = {
    color: "#2563eb",
    textDecoration: "underline",
    marginBottom: "10px",
    display: "block",
};

const policy = {
    marginBottom: "30px",
};

const policyText = {
    fontSize: "12px",
    color: "#666",
    lineHeight: "1.5",
};

const divider = {
    borderTop: "1px solid #ddd",
    margin: "20px 0",
};

const footer = {
    fontSize: "12px",
    color: "#666",
};

const footerTitle = {
    fontWeight: "bold",
    margin: "0 0 5px",
};

const footerText = {
    margin: "0 0 5px",
};

const helpLink = {
    color: "#2563eb",
    fontWeight: "bold",
    margin: "10px 0",
    display: "block",
};

const copyright = {
    margin: "15px 0",
    lineHeight: "1.5",
};

const footerLink = {
    color: "#2563eb",
    textDecoration: "underline",
    marginRight: "15px",
};

export default OrderInvoice;
