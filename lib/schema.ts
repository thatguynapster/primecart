import { isValidPhoneNumber, isPossiblePhoneNumber } from "react-phone-number-input"; // prettier-ignore
import { string, number, mixed, array, StringSchema, NumberSchema, MixedSchema } from 'yup'; // prettier-ignore
// import { MixedSchema } from 'yup/lib/mixed';

import { phoneNumberFormat } from "./helpers";

/**
 * validation object for string
 */
export const requireString = (
  field: string,
  required = true,
  schema: StringSchema = string()
) => {
  schema = schema.trim();
  return required ? schema.required(`${field} is required`) : schema;
};

/**
 * validation object for number
 */
export const requireNumber = (
  field: string,
  required = true,
  schema: NumberSchema = number()
) => {
  schema = schema.typeError("Only numbers allowed");
  return required ? schema.required(`${field} is required`) : schema;
};

/**
 * validation object for phone number
 */
export const requirePhoneNumber = (
  field: string,
  required = true,
  schema: StringSchema = string()
) => {
  return schema.test("isValidPhone", `Enter a valid ${field}`, (value) => {
    value = value ? phoneNumberFormat(value, true) : value;

    return value
      ? isValidPhoneNumber(value) && isPossiblePhoneNumber(value)
      : !required;
  });
};

/**
 * validation object for conditions
 */
export const requireWhen = (dependencyField: string, field: string) =>
  string().when(`${dependencyField}`, (fld, schema) =>
    fld ? schema.required(`${field} is required`) : schema
  );

/**
 * validation object for test conditions
 */
export const requireTest = (
  field: string,
  condition: (value: string | undefined) => boolean
) =>
  string().test("require", `${field} is required`, (value) => condition(value));

/**
 * validation object for email
 */
export const requireEmail = (
  field: string,
  required = true,
  schema: StringSchema = string()
) => {
  schema = schema.email("Enter a valid email");
  return required ? schema.required(`${field} is required`) : schema;
};

/**
 * validation object for array
 */
export const requireArray = (
  field: string,
  required = true,
  schema = array()
) => {
  return required
    ? schema
        .min(1, `${field} must have at least 1 item`)
        .required(`${field} is required`)
    : schema;
};

/**
 * validation object for file upload
 */
export const requireFile = ({
  field,
  size = 2,
  type = [],
  schema = mixed(),
  required = true,
}: {
  field: string;
  size?: number;
  type?: string[];
  schema?: MixedSchema;
  required?: boolean;
}) => {
  const format: string[] = (() => {
    let format: string[] = [];

    if (type.includes("image")) {
      format = [
        ...format,
        ...["image/jpg", "image/jpeg", "image/png", "image/webp"],
      ];
    }

    if (type.includes("pdf")) {
      format = [...format, "application/pdf"];
    }

    if (type.includes("csv")) {
      format = [
        ...format,
        "text/csv",
        "text/x-csv",
        "application/vnd.ms-excel",
      ];
    }

    if (type.includes("docs")) {
      format = [
        ...format,
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
    }

    return format;
  })();

  return schema
    .test(
      "fileName",
      `${field} is required`,
      (value: any) => !!value?.name || !required
    )
    .test("fileSize", `${field} size is too large`, (value: any) =>
      value?.size ? value.size <= size * 1000000 : !required
    )
    .test("fileType", "Unsupported file format", (value: any) =>
      value?.type
        ? format.length === 0
          ? true
          : format.includes(value?.type)
        : !required
    );
};

/**
 * password validation schema
 * @param {*} field
 * @param {*} required
 * @param {*} schema
 * @returns
 */
export const requirePassword = (
  field: string,
  required = true,
  schema: StringSchema = string()
) => {
  schema = schema
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/,
      "Must contain a lower case and upper case letter and number"
    )
    .min(8, "Password must be at least 8 characters");

  return required ? schema.required(`${field} is required`) : schema;
};

/**
 * Full name validator
 * @param {*} field
 * @param {*} required
 * @param {*} schema
 * @returns
 */
export const requireFullName = (
  field: string,
  required = true,
  schema: StringSchema = string()
) => {
  schema = schema
    .test("name", "Please enter a valid first name and last name", (value) => {
      const name = value?.trim()?.split(" ");
      if (name && name?.length <= 1) {
        return false;
      }

      return true;
    })
    .test("length", "Name must have at least 3 characters", (value) => {
      const name = value?.trim()?.split(" ");

      if (name && name?.find((i) => i.length < 2)) {
        return false;
      }

      return true;
    });

  return required ? schema.required(`${field} is required`) : schema;
};

/**
 * OTP code validator
 * @param {*} field
 * @param {*} required
 * @param {*} schema
 * @param {*} length
 * @returns
 */
export const requireOTP = (
  field: string,
  length = 4,
  required = true,
  schema: StringSchema = string()
) => {
  schema = schema
    .matches(/^[0-9]+$/, "Must be only digits")
    .min(length, `Must be exactly ${length} digits`)
    .max(length, `Must be exactly ${length} digits`);

  return required ? schema.required(`${field} is required`) : schema;
};

export const requireUrl = (
  field: string,
  required = true,
  schema: StringSchema = string()
) => {
  schema = schema.url("Enter a valid url");
  return required ? schema.required(`${field} is required`) : schema;
};

// export default Object.assign(
//   {},
//   {
//     requireString,
//     requireNumber,
//     requireArray,
//     requireEmail,
//     requirePhoneNumber,
//     requireFile,
//     requireWhen,
//     requireTest,
//     requirePassword,
//     requireFullName,
//     requireOTP,
//     requireUrl,
//   },
// );
