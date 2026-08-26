export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  name: string;
  surname: string;
};

export type UpdateProfileRequest = {
  email?: string;
  name?: string;
  surname?: string;
  profileImage?: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  surname: string | null;
  profileImage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LoginResponse = AuthTokens & {
  user: AuthUser;
};

export type RefreshTokenRequest = {
  refreshToken: string;
};

export type RefreshResponse = AuthTokens;

export type LogoutResponse = {
  message: string;
};

export type RegisterResponse = UserProfile;
export type ProfileResponse = UserProfile;

export type ChangePasswordResponse = {
  id: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type ResetPasswordResponse = {
  message: string;
};
