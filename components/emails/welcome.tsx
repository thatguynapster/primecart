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

export const WelcomeEmail = ({ firstName }: { firstName: string }) => {
    return (
        <Html>
            <Head />
            <Preview>Welcome to PrimeCart – Your journey starts here 🚀</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Logo Header */}
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
                        <Text style={h1}>Welcome to PrimeCart</Text>
                        <Text style={paragraph}>
                            Hi {firstName},
                        </Text>
                        <Text style={paragraph}>
                            We're thrilled to have you on board! With <strong>PrimeCart</strong>,
                            setting up and managing your online store is easier than ever. From
                            adding products and tracking sales to customizing your storefront and
                            monitoring analytics, everything you need is right here.
                        </Text>

                        {/* Steps */}
                        <Text style={paragraph}><strong>Here's how to get started:</strong></Text>
                        <Text style={list}>
                            1. <strong>Set up your store details</strong> - Add your business name, logo, and preferences. <br />
                            2. <strong>Add your first product</strong> - Upload product details, images, and variations. <br />
                            3. <strong>Preview your storefront</strong> - See how your store looks to customers.
                        </Text>

                        {/* CTA Button */}
                        <Section style={{ textAlign: "center", margin: "30px 0" }}>
                            <Button style={button} href="https://primecart.com/login">
                                Log in to Your Dashboard
                            </Button>
                        </Section>

                        <Text style={paragraph}>
                            And remember, PrimeCart is built with you in mind — we only win when you win.
                            That means no hidden fees, no unnecessary charges. Just pure growth.
                        </Text>

                        <Text style={paragraph}>
                            If you ever need help, our support team is just an email away at{" "}
                            <a href="mailto:support@primecart.app" style={link}>support@primecart.app</a>.
                        </Text>

                        <Text style={paragraph}>
                            We can't wait to see you grow!
                            <br /><br />
                            Cheers, <br />
                            The PrimeCart Team
                        </Text>
                    </Section>

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            You're receiving this email because you signed up for PrimeCart.
                        </Text>
                        {/* <Text style={footerText}>
                            <a href="#" style={link}>Unsubscribe</a> |{" "}
                            <a href="#" style={link}>Manage Preferences</a>
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
    // borderRadius: "8px",
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
    color: "#111827",
    fontSize: "22px",
    fontWeight: "bold",
};

const paragraph = {
    fontSize: "16px",
    lineHeight: "24px",
    margin: "16px 0",
    color: "#333333",
};

const list = {
    fontSize: "16px",
    lineHeight: "26px",
    color: "#333333",
    margin: "12px 0",
};

const button = {
    display: "inline-block",
    padding: "12px 24px",
    backgroundColor: "#1b1b1b",
    color: "#ffffff",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "bold",
};

const link = {
    color: "#4f46e5",
    textDecoration: "none",
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

export default WelcomeEmail;
