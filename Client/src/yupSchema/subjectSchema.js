import * as yup from "yup";

export const subjectSchema = yup.object({
  subjectName: yup
    .string()
    .min(2, "Atleast 2 Character are required")
    .required("Subject Name is required"),
  subjectCode: yup
    .string()
    .required("Subject code is required"),
});
