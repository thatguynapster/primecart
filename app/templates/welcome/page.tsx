import WelcomeEmail from "@/components/emails/welcome"
import React from 'react'

type Props = {}

const WelcomePage = (props: Props) => {
    return (
        <WelcomeEmail firstName="Andrew" />
    )
}

export default WelcomePage