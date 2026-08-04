export { fetchIndustriesAndSkills } from '@/services/workerOperations';
export { submitWorkerApplication } from '@/services/workerApplication';
import { EMAIL_PATTERN } from '@/features/auth/logic/AuthRegisterScreenLogic';
export { EMAIL_PATTERN } from '@/features/auth/logic/AuthRegisterScreenLogic';
import { isValidPhilippinePhone } from '@/lib/workerRegistration';

export const WORKER_PASSWORD_PATTERN =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const MAX_SELECTED_SKILLS = 10;

export const formatBirthdayInput = (text: string): string => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  let formatted = digits;
  if (digits.length > 2) {
    formatted = digits.slice(0, 2) + '/' + digits.slice(2);
  }
  if (digits.length > 4) {
    formatted =
      digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
  }
  return formatted;
};

export const validateWorkerStep1 = (fields: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthday: string;
  password: string;
  confirmPassword: string;
}): Record<string, string> => {
  const e: Record<string, string> = {};
  if (!fields.firstName) e.firstName = 'First name is required';
  if (!fields.lastName) e.lastName = 'Last name is required';
  if (!EMAIL_PATTERN.test(fields.email)) e.email = 'Valid email is required';
  if (!isValidPhilippinePhone(fields.phone))
    e.phone = 'Valid Philippine number required';
  if (!fields.birthday) e.birthday = 'Birthday is required';
  if (!WORKER_PASSWORD_PATTERN.test(fields.password))
    e.password = 'Use 8+ characters with uppercase, number, and symbol';
  if (fields.password !== fields.confirmPassword)
    e.confirmPassword = 'Passwords do not match';
  return e;
};

export const validateWorkerStep2 = (fields: {
  industryValue: string;
  industries: Array<{ value: string }>;
  employmentType: string;
  selectedSkills: string[];
  availableSkills: Array<{ value: string }>;
}): Record<string, string> => {
  const e: Record<string, string> = {};
  if (
    !fields.industryValue ||
    !fields.industries.some((option) => option.value === fields.industryValue)
  )
    e.industry = 'Please select a primary industry';
  if (!fields.employmentType)
    e.employmentType = 'Please select employment type';
  if (fields.selectedSkills.length === 0)
    e.skills = 'Select at least one skill';
  else if (fields.selectedSkills.length > MAX_SELECTED_SKILLS)
    e.skills = 'Select up to 10 skills';
  else if (
    fields.selectedSkills.some(
      (value) => !fields.availableSkills.some((skill) => skill.value === value),
    )
  )
    e.skills = 'Select skills from the chosen industry';
  return e;
};

export const validateWorkerStep3 = (fields: {
  street: string;
  city: string;
  region: string;
  contactPerson: string;
  contactPhone: string;
  idType: string;
  frontId: string | null;
  backId: string | null;
}): Record<string, string> => {
  const e: Record<string, string> = {};
  if (!fields.street) e.street = 'Street is required';
  if (!fields.city) e.city = 'City is required';
  if (!fields.region) e.region = 'Province is required';
  if (!fields.contactPerson) e.contactPerson = 'Contact person is required';
  if (!fields.contactPhone || !isValidPhilippinePhone(fields.contactPhone))
    e.contactPhone = 'Valid phone number required';
  if (!fields.idType) e.idType = 'Please select an ID type';
  if (!fields.frontId) e.frontId = 'Front of ID is required';
  if (!fields.backId) e.backId = 'Back of ID is required';
  return e;
};
