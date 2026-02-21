// Field types supported by the form builder
export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "select"
  | "checkbox"
  | "radio"
  | "heading"
  | "divider";

// Conditional logic operators
export type ConditionOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "isEmpty"
  | "isNotEmpty";

// Show/hide condition for a field
export interface FieldCondition {
  fieldId: string;
  operator: ConditionOperator;
  value?: string;
}

// Prefill keys that map to known client data
export type PrefillKey = "name" | "email" | "website" | "serviceName";

// A single field definition in the form schema
export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For select, radio, checkbox
  width?: "full" | "half";
  order: number;
  conditions?: FieldCondition[];
  prefillKey?: PrefillKey;
}

// Form submission handler type
export type FormHandlerType = "standard" | "helpscout";

// Per-form settings stored as JSON
export interface FormSettings {
  type: FormHandlerType;
  emailNotification: boolean;
  emailTo: string;
  storeSubmissions: boolean;
  webhookUrl: string | null;
  submitButtonLabel: string;
  successMessage: string;
  redirectUrl: string | null;
}

// Default settings for new forms
export const DEFAULT_FORM_SETTINGS: FormSettings = {
  type: "standard",
  emailNotification: true,
  emailTo: "",
  storeSubmissions: true,
  webhookUrl: null,
  submitButtonLabel: "Submit",
  successMessage: "Thanks! We'll be in touch.",
  redirectUrl: null,
};

// Prefill data passed to FormRenderer
export interface FormPrefillData {
  name?: string;
  email?: string;
  website?: string;
  serviceName?: string;
}

// Field type metadata for the builder palette
export interface FieldTypeInfo {
  type: FormFieldType;
  label: string;
  icon: string; // Lucide icon name
  hasOptions: boolean;
  hasPlaceholder: boolean;
  isLayout: boolean; // heading/divider are layout-only
}

export const FIELD_TYPES: FieldTypeInfo[] = [
  { type: "text", label: "Text", icon: "Type", hasOptions: false, hasPlaceholder: true, isLayout: false },
  { type: "textarea", label: "Textarea", icon: "AlignLeft", hasOptions: false, hasPlaceholder: true, isLayout: false },
  { type: "email", label: "Email", icon: "Mail", hasOptions: false, hasPlaceholder: true, isLayout: false },
  { type: "phone", label: "Phone", icon: "Phone", hasOptions: false, hasPlaceholder: true, isLayout: false },
  { type: "select", label: "Dropdown", icon: "ChevronDown", hasOptions: true, hasPlaceholder: true, isLayout: false },
  { type: "radio", label: "Radio", icon: "Circle", hasOptions: true, hasPlaceholder: false, isLayout: false },
  { type: "checkbox", label: "Checkbox", icon: "CheckSquare", hasOptions: true, hasPlaceholder: false, isLayout: false },
  { type: "heading", label: "Heading", icon: "Heading3", hasOptions: false, hasPlaceholder: false, isLayout: true },
  { type: "divider", label: "Divider", icon: "Minus", hasOptions: false, hasPlaceholder: false, isLayout: true },
];
