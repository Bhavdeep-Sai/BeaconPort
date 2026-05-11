import * as Yup from "yup";


export const teacherSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  qualification: Yup.string()
    .required('Qualification is required'),
  age: Yup.number()
    .required('Age is required')
    .positive('Age must be positive')
    .integer('Age must be an integer'),
  gender: Yup.string()
    .required('Gender is required'),
  subject: Yup.string(),
  teacherClasses: Yup.array(),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
});