import * as yup from "yup";

export const classSchema = yup.object({
  classText: yup
    .string()
    .min(2, "Atleast 2 Character are required")
    .required("Class Text is required"),
  classNum: yup
    .string()
    .required("Class number is required"),
});
