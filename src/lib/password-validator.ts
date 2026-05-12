/**
 * Password strength validator
 * Checks for weak and common passwords
 */

const COMMON_WEAK_PASSWORDS = [
  "123456",
  "password",
  "123456789",
  "12345678",
  "12345",
  "111111",
  "1234567",
  "dragon",
  "123123",
  "baseball",
  "abc123",
  "football",
  "monkey",
  "letmein",
  "shadow",
  "master",
  "batman",
  "superman",
  "trustno1",
  "1234567890",
  "qwerty",
  "password123",
  "admin",
  "root",
  "toor",
  "pass",
  "test",
  "guest",
  "hello",
  "welcome",
  "login",
  "flower",
  "sunshine",
  "princess",
  "123qwe",
  "admin123",
  "password1",
  "passw0rd",
  // Vietnamese common weak passwords
  "123456a",
  "abcdef",
  "aaaaaa",
  "111111",
  "222222",
];

export interface PasswordStrength {
  isValid: boolean;
  score: number; // 0-5
  message: string;
  issues: string[];
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const issues: string[] = [];
  let score = 0;

  if (!password) {
    return {
      isValid: false,
      score: 0,
      message: "Mật khẩu không được để trống",
      issues: ["Mật khẩu không được để trống"],
    };
  }

  // Check length
  if (password.length < 8) {
    issues.push("Tối thiểu 8 ký tự");
  } else if (password.length >= 8) {
    score++;
  }

  if (password.length >= 12) {
    score++;
  }

  // Check for uppercase letters
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    issues.push("Cần ít nhất một chữ hoa");
  }

  // Check for lowercase letters
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    issues.push("Cần ít nhất một chữ thường");
  }

  // Check for numbers
  if (/\d/.test(password)) {
    score++;
  } else {
    issues.push("Cần ít nhất một chữ số");
  }

  // Check for special characters
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score++;
  } else {
    issues.push("Nên có ít nhất một ký tự đặc biệt");
  }

  // Check against common weak passwords (case insensitive)
  if (COMMON_WEAK_PASSWORDS.includes(password.toLowerCase())) {
    return {
      isValid: false,
      score: 0,
      message: "Mật khẩu quá yếu và dễ đoán, vui lòng chọn mật khẩu khác",
      issues: ["Mật khẩu quá yếu và dễ đoán"],
    };
  }

  // Check for sequential characters (e.g., "123456", "abcdef")
  if (/(?:012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij)/.test(password.toLowerCase())) {
    issues.push("Tránh sử dụng các ký tự liên tiếp");
  }

  // Check for repeated characters (e.g., "aaaaaa", "111111")
  if (/(.)\1{4,}/.test(password)) {
    issues.push("Tránh lặp lại ký tự quá nhiều lần");
  }

  const isValid = score >= 3 && !COMMON_WEAK_PASSWORDS.includes(password.toLowerCase());

  return {
    isValid,
    score: Math.min(score, 5),
    message: isValid
      ? `Mật khẩu mạnh (Điểm: ${score}/5)`
      : "Mật khẩu quá yếu và dễ đoán, vui lòng chọn mật khẩu khác",
    issues,
  };
}

export function getPasswordStrengthColor(score: number): string {
  if (score <= 1) return "bg-red-500";
  if (score <= 2) return "bg-orange-500";
  if (score <= 3) return "bg-yellow-500";
  if (score <= 4) return "bg-lime-500";
  return "bg-green-500";
}

export function getPasswordStrengthLabel(score: number): string {
  if (score <= 1) return "Rất yếu";
  if (score <= 2) return "Yếu";
  if (score <= 3) return "Trung bình";
  if (score <= 4) return "Mạnh";
  return "Rất mạnh";
}
