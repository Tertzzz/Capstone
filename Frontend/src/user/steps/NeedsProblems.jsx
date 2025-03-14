import React from "react";
import { useForm } from "react-hook-form";
import "./NeedsProblems.css";
import "./shared.css";

export default function NeedsProblems({ prevStep, nextStep, formData, updateFormData }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: formData
  });

  const onSubmit = data => {
    updateFormData(data);
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="needs-form step-form">
      <h2 className="needs-title step-header">Step 4: Needs/Problems of Being a Solo Parent</h2>
      <div className="needs-input-container">
        <label className="needs-label step-label">Please describe your needs or problems:</label>
        <textarea
          {...register("needsProblems", { required: "This field is required" })}
          className={`needs-input step-input ${errors.needsProblems ? 'error' : ''}`}
          rows={4}
        />
        {errors.needsProblems && <p className="needs-error">{errors.needsProblems.message}</p>}
      </div>
      <div className="needs-buttons">
        <button type="button" onClick={prevStep}>Back</button>
        <button type="submit">Next</button>
      </div>
    </form>
  );
}
