import { Body, Container, Head, Html, Preview, Text } from "@react-email/components";
import * as React from "react";

// A personal note from Ali, not a branded email: no logo, no buttons.
const bodyStyle: React.CSSProperties = {
	backgroundColor: "#ffffff",
	fontFamily:
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const containerStyle: React.CSSProperties = {
	maxWidth: "520px",
	padding: "24px 20px",
};

const textStyle: React.CSSProperties = {
	color: "#1a1a1a",
	fontSize: "15px",
	lineHeight: "24px",
	margin: "0 0 16px",
};

const finePrintStyle: React.CSSProperties = {
	color: "#9b9b9b",
	fontSize: "12px",
	lineHeight: "18px",
	margin: "32px 0 0",
};

export const MobileAppWelcomeEmail = () => (
	<Html lang="en">
		<Head />
		<Preview>Thanks for signing up for the Luhive mobile app</Preview>
		<Body style={bodyStyle}>
			<Container style={containerStyle}>
				<Text style={textStyle}>
					Hey, Ali here. Thanks for signing up for the Luhive mobile app, you're
					one of the first.
				</Text>
				<Text style={textStyle}>
					Every week I'll send you a short note on what we built and what broke,
					and you can just hit reply to tell me what you want in it.
				</Text>
				<Text style={finePrintStyle}>
					You're getting this because you joined at luhive.com/app.
				</Text>
			</Container>
		</Body>
	</Html>
);

export default MobileAppWelcomeEmail;
