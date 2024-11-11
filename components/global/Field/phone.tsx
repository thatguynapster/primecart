"use client";

import { getCountries, getCountryCallingCode } from "react-phone-number-input";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { parsePhoneNumber } from "react-phone-number-input";
import PhoneInput from "react-phone-number-input/input";
import { type CountryCode } from "libphonenumber-js";
import countryList from "react-select-country-list";
import Flag from "react-country-flag";
import { debounce } from "lodash";

import { classNames, phoneNumberFormat } from "@/lib/utils";
import Dropdown from "../Dropdown";

export interface PhoneInputProps {
  name: string;
  value: string;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  onlyCountries?: CountryCode[];
  defaultCountry?: CountryCode;
  setFieldValue: (
    field: string,
    value: string,
    shouldValidate?: boolean
  ) => void;
  setFieldTouched: (
    field: string,
    isTouched?: boolean,
    shouldValidate?: boolean
  ) => void;
  showCountryCode?: boolean;
}

export function Phone({
  name,
  value,
  disabled,
  autoFocus,
  placeholder,
  onlyCountries,
  setFieldValue,
  setFieldTouched,
  defaultCountry = "GH",
  showCountryCode,
}: PhoneInputProps) {
  /**
   * states
   */
  const [countries, setCounties] = useState<
    {
      country: CountryCode;
      value: string;
      label: string;
    }[]
  >();

  /**
   * ref
   */
  const phoneRef = useRef<any>(null);

  const [country, setCountry] = useState<{
    code: CountryCode | undefined;
    callingCode?: string;
  }>(() => {
    if (value) {
      const phoneNumber = parsePhoneNumber(value);

      if (phoneNumber) {
        return {
          code: phoneNumber?.country,
          callingCode: phoneNumber?.countryCallingCode,
        };
      }
    }

    return {
      code: defaultCountry,
      callingCode: getCountryCallingCode(defaultCountry),
    };
  });

  /**
   * function
   */
  const handleCountries = useCallback(
    debounce(() => {
      const selectedCountries: CountryCode[] = onlyCountries || getCountries();

      const countries = selectedCountries
        .filter((e) => countryList().getLabel(e))
        .map((countryCode: CountryCode) => ({
          country: countryCode,
          value: countryList().getLabel(countryCode),
          label: getCountryCallingCode(countryCode),
        }))
        .sort((a, b) => {
          const AName = a.value;
          const BName = b.value;

          if (AName < BName) {
            return -1;
          }

          if (AName > BName) {
            return 1;
          }

          return 0;
        });

      setCounties(countries);
    }, 1000),
    [onlyCountries]
  );

  /**
   * useEffect
   */
  useEffect(() => {
    handleCountries();
  }, [handleCountries]);

  useEffect(() => {
    if (autoFocus && phoneRef.current) {
      phoneRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div className="flex gap-2 items-center">
      <Dropdown className="pl-4">
        <Dropdown.Toggle
          type="button"
          className="flex items-center gap-1 border-0 text-sm w-[42px] py-3"
        >
          <span>{showCountryCode ? country.code : country.callingCode}</span>
          {country.code && (
            <Flag
              countryCode={country.code}
              className="w-5 h-5 rounded-full img"
              svg
            />
          )}
        </Dropdown.Toggle>
        <Dropdown.Menu placement="bottom-start" className="">
          {!!countries?.length &&
            countries.map(({ label, value, ...others }, key) => {
              if (!label || !value) return false;

              return (
                <Dropdown.Item
                  key={key}
                  active={country.code === others.country}
                  onClick={() => {
                    setCountry({
                      code: others.country,
                      callingCode: getCountryCallingCode(others.country),
                    });
                    setFieldValue(name, "");
                  }}
                >
                  {value} (+{label})
                </Dropdown.Item>
              );
            })}
        </Dropdown.Menu>
      </Dropdown>

      <PhoneInput
        ref={phoneRef}
        international={false}
        country={country.code}
        className={classNames(
          "px-3.5 py-2.5 w-full border-0 border-b-2",
          "border-dark dark:border-light",
          "bg-light dark:bg-dark"
        )}
        onBlur={() => setFieldTouched(name, true)}
        value={value ? phoneNumberFormat(value, true) : ""}
        onChange={(value: any) => setFieldValue(name, phoneNumberFormat(value))}
        {...{ disabled, placeholder }}
      />
    </div>
  );
}

export default React.memo(PhoneInput);
