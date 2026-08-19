export interface WorkerRegistrationReadinessInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthday: string;
  industryValue: string;
  selectedSkills: string[];
  street: string;
  city: string;
  region: string;
}

export interface WorkerRegistrationReadiness {
  complete: boolean;
  missing: string[];
  firstIncompleteStep: 1 | 2 | 3 | null;
}

export function getWorkerRegistrationReadiness(
  input: WorkerRegistrationReadinessInput,
): WorkerRegistrationReadiness {
  const accountMissing = [
    ['First name', input.firstName],
    ['Last name', input.lastName],
    ['Email', input.email],
    ['Phone', input.phone],
    ['Birthday', input.birthday],
  ]
    .filter(([, value]) => !value.trim())
    .map(([label]) => label);

  const serviceMissing = [
    ...(input.industryValue.trim() ? [] : ['Industry']),
    ...(input.selectedSkills.length > 0 ? [] : ['At least one skill']),
  ];

  const addressMissing = [
    ['Street address', input.street],
    ['City', input.city],
    ['Region', input.region],
  ]
    .filter(([, value]) => !value.trim())
    .map(([label]) => label);

  const missing = [...accountMissing, ...serviceMissing, ...addressMissing];
  return {
    complete: missing.length === 0,
    missing,
    firstIncompleteStep:
      accountMissing.length > 0
        ? 1
        : serviceMissing.length > 0
          ? 2
          : addressMissing.length > 0
            ? 3
            : null,
  };
}
