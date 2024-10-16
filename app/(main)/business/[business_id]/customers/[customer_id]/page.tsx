import React from "react";

type Props = { params: { business_id: string; customer_id: string } };

const CustomerDetailsPage = ({
  params: { business_id, customer_id },
}: Props) => {
  return <div>CustomerDetailsPage</div>;
};

export default CustomerDetailsPage;
