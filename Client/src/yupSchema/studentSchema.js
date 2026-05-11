import * as yup from 'yup';

export const studentSchema = yup.object({
    email: yup.string().email("It must be an Email").required("Email is Required"),
    name: yup.string().min(3, "Student name must contain 3 charactes.").required("Student name is required"),
    studentClass: yup.string().required("Student class is Required"),
    age: yup.string().required("Age is Required"),
    gender:yup.string().required("Gender is required Field"),
    parent: yup.string().min(4, "Must contain atleast 4 characcters").required("Parent name is Required"),
    parentNum: yup.string().min(9, "Must contain atleast 9 characcters").max(11,"Cannot extend 11 characters").required("Parent number is Required"),
    password: yup.string().min(8, "Password must contaian atleast 8 characters").required("Password is required"),
    confirmPassword : yup.string().oneOf([yup.ref('password')], "Confirm password must match with Password.").required("Confirm password is Required")
})