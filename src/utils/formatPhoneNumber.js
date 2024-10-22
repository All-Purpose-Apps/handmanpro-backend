export function formatPhoneNumber(input) {
  // Remove all non-numeric characters
  const cleaned = input.replace(/\D/g, '');

  // If the input starts with '1' or '+1', remove it as it's the US country code
  let phoneNumber = cleaned;

  if (cleaned.length === 11 && cleaned[0] === '1') {
    phoneNumber = cleaned.substring(1);
  } else if (cleaned.length > 11) {
    return 'Invalid phone number'; // Prevent inputs longer than 11 digits (with country code)
  }

  // Ensure the remaining part of the phone number has 10 digits
  if (phoneNumber.length !== 10) {
    return 'Invalid phone number';
  }

  // Format the phone number into (123) 456-7890
  const formatted = `(${phoneNumber.substring(0, 3)}) ${phoneNumber.substring(3, 6)}-${phoneNumber.substring(6, 10)}`;

  return formatted;
}
