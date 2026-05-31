import { Box, Text, TextInput } from "@sanity/ui";

// Shared password-input block used by admin-action dialogs
// (resendCustomerEmail, sendEmailPreview, future siblings). Keeps the
// label + spacing + type="password" + disabled-while-pending behaviour
// consistent across actions so a future label tweak lands in one place.
export function AdminTokenInput(props: {
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}) {
  const {
    value,
    onChange,
    onBlur,
    disabled,
    label = "Admin token:",
    placeholder = "Paste the admin token",
  } = props;
  return (
    <Box>
      <Text size={1} weight="semibold">
        {label}
      </Text>
      <Box marginTop={2}>
        <TextInput
          type="password"
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
        />
      </Box>
    </Box>
  );
}
