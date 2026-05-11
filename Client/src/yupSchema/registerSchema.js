import * as yup from 'yup';

export const registerSchema = yup.object({
    schoolName: yup.string().min(8, "School name must contain 8 charactes.").required("School name is required"),
    email: yup.string().email("It must be an Email").required("Email is Required"),
    ownerName : yup.string().min(5, "Onwer name must have 5 characters").required("Owner name is required"),
    password: yup.string().min(8, "Password must contaian atleast 8 characters").required("Password is required"),
    confirmPassword : yup.string().oneOf([yup.ref('password')], "Confirm password must match with Password.").required("Confirm password is Required")
})