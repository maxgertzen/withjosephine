import { DatePicker } from "@/components/Form/DatePicker";
import { FileUpload } from "@/components/Form/FileUpload";
import { Input } from "@/components/Form/Input";
import { MultiSelectExact } from "@/components/Form/MultiSelectExact";
import { PlaceAutocomplete } from "@/components/Form/PlaceAutocomplete";
import { Select } from "@/components/Form/Select";
import { Textarea } from "@/components/Form/Textarea";
import { TimePicker } from "@/components/Form/TimePicker";
import { COMPANION_SUFFIX_GEONAMEID } from "@/lib/booking/constants";
import {
  isNameFollowupEnabled,
  nameFollowupKey,
} from "@/lib/booking/nameFollowup";
import { TIME_UNKNOWN_SENTINEL } from "@/lib/booking/submissionSchema";
import { fieldDomId } from "@/lib/intake/intakeValidation";
import type { SanityFormField } from "@/lib/sanity/types";

import type { FieldValue, FieldValues } from "./types";

export type RenderContext = {
  values: FieldValues;
  setValue: (key: string, value: FieldValue) => void;
  errors: Record<string, string>;
  disabled: boolean;
  timeUnknownPairs: Map<string, string>;
  timeUnknownLabels: Map<string, string>;
  requestTurnstileToken: () => Promise<string | null>;
};

export function renderField(field: SanityFormField, ctx: RenderContext) {
  const {
    values,
    setValue,
    errors,
    disabled,
    timeUnknownPairs,
    timeUnknownLabels,
    requestTurnstileToken,
  } = ctx;
  const id = fieldDomId(field.key);
  const error = errors[field.key];
  const value = values[field.key];
  const shellProps = {
    helpText: field.helpText,
    helperPosition: field.helperPosition,
    clarificationNote: field.clarificationNote,
  };

  switch (field.type) {
    case "shortText":
    case "email":
      return (
        <Input
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          type={field.type === "email" ? "email" : "text"}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValue(field.key, next)}
          placeholder={field.placeholder}
          {...shellProps}
          error={error}
          required={field.required}
          disabled={disabled}
        />
      );

    case "longText":
      return (
        <Textarea
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValue(field.key, next)}
          placeholder={field.placeholder}
          {...shellProps}
          error={error}
          required={field.required}
          disabled={disabled}
          maxLength={field.validation?.maxLength}
        />
      );

    case "date":
      return (
        <DatePicker
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValue(field.key, next)}
          {...shellProps}
          error={error}
          required={field.required}
          disabled={disabled}
          minAge={field.key === "date_of_birth" ? 18 : undefined}
        />
      );

    case "time": {
      const unknownKey = timeUnknownPairs.get(field.key);
      const unknownChecked = unknownKey ? values[unknownKey] === true : false;
      const timeValue =
        typeof value === "string" && value !== TIME_UNKNOWN_SENTINEL ? value : "";
      const unknownLabel = unknownKey ? timeUnknownLabels.get(field.key) : undefined;

      return (
        <TimePicker
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={unknownChecked ? TIME_UNKNOWN_SENTINEL : timeValue}
          onChange={(next) => setValue(field.key, next)}
          {...shellProps}
          error={error}
          required={field.required}
          disabled={disabled}
          unknownToggle={
            unknownKey && unknownLabel
              ? {
                  label: unknownLabel,
                  checked: unknownChecked,
                  onChange: (checked) => {
                    setValue(unknownKey, checked);
                    setValue(field.key, checked ? TIME_UNKNOWN_SENTINEL : "");
                  },
                }
              : undefined
          }
        />
      );
    }

    case "select":
      return (
        <Select
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValue(field.key, next)}
          options={field.options ?? []}
          placeholder={field.placeholder}
          {...shellProps}
          error={error}
          required={field.required}
          disabled={disabled}
        />
      );

    case "multiSelectExact": {
      const followupValues: Record<string, string> = {};
      for (const option of field.options ?? []) {
        if (!isNameFollowupEnabled(option)) continue;
        const v = values[nameFollowupKey(option.value)];
        followupValues[option.value] = typeof v === "string" ? v : "";
      }
      return (
        <MultiSelectExact
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={Array.isArray(value) ? value : []}
          onChange={(next) => setValue(field.key, next)}
          options={field.options ?? []}
          count={field.multiSelectCount ?? 0}
          helpText={field.helpText}
          error={error}
          required={field.required}
          disabled={disabled}
          nameFollowupValues={followupValues}
          onNameFollowupChange={(optionValue, text) =>
            setValue(nameFollowupKey(optionValue), text)
          }
        />
      );
    }

    case "fileUpload":
      return (
        <FileUpload
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValue(field.key, next)}
          {...shellProps}
          error={error}
          required={field.required}
          disabled={disabled}
          requestTurnstileToken={requestTurnstileToken}
        />
      );

    case "placeAutocomplete":
      return (
        <PlaceAutocomplete
          key={field._id}
          id={id}
          name={field.key}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setValue(field.key, next)}
          onGeonameIdChange={(geonameid) =>
            setValue(
              `${field.key}${COMPANION_SUFFIX_GEONAMEID}`,
              geonameid === null ? "" : String(geonameid),
            )
          }
          placeholder={field.placeholder}
          {...shellProps}
          error={error}
          required={field.required}
          disabled={disabled}
        />
      );

    default:
      return null;
  }
}
