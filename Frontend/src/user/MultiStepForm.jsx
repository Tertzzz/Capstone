import React, { useState } from "react";
import IdentifyingInformation from "./steps/IdentifyingInformation";
import FamilyOccupation from "./steps/FamilyOccupation";
import Classification from "./steps/Classification";
import NeedsProblems from "./steps/NeedsProblems";
import InCaseOfEmergency from "./steps/InCaseOfEmergency";
import "./MultiStepForm.css";

export default function MultiStepForm() {
  // Add age calculation function
  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const [step, setStep] = useState(1);
  const totalSteps = 5;
  const [formData, setFormData] = useState({
    // Step 1: Personal Information
    firstName: "",
    middleName: "",
    lastName: "",
    age: "",
    gender: "",
    dateOfBirth: "",
    placeOfBirth: "",
    barangay: "",
    education: "",
    civilStatus: "",
    occupation: "",
    religion: "",
    company: "",
    income: "",
    employmentStatus: "",
    contactNumber: "",
    email: "",
    pantawidBeneficiary: "",
    indigenous: "",
    
    // Step 2: Children
    children: [],
    
    // Step 3: Classification
    Classification: "",
    
    // Step 4: Needs/Problems
    needsProblems: "",
    
    // Step 5: Emergency Contact
    emergencyContact: {
      emergencyName: "",
      emergencyRelationship: "",
      emergencyAddress: "",
      emergencyContact: ""
    }
  });

  const updateFormData = (newData) => {
    // Add age calculation when date of birth is updated
    if (newData.dateOfBirth) {
      const calculatedAge = calculateAge(newData.dateOfBirth);
      newData.age = calculatedAge.toString();
    }
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const nextStep = () => {
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleFinalSubmit = async () => {
    try {
      const submissionData = {
        formData: {
          // Step 1: Personal Information
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          age: formData.age,
          gender: formData.gender,
          dateOfBirth: formData.dateOfBirth,
          placeOfBirth: formData.placeOfBirth,
          barangay: formData.barangay,
          education: formData.education,
          civilStatus: formData.civilStatus,
          occupation: formData.occupation,
          religion: formData.religion,
          company: formData.company,
          income: formData.income,
          employmentStatus: formData.employmentStatus,
          contactNumber: formData.contactNumber,
          email: formData.email,
          pantawidBeneficiary: formData.pantawidBeneficiary,
          indigenous: formData.indigenous,

          // Step 2: Children
          children: formData.children.map(child => ({
            firstName: child.firstName,
            middleName: child.middleName,
            lastName: child.lastName,
            birthdate: child.birthdate,
            age: child.age,
            educationalAttainment: child.educationalAttainment
          })),

          // Step 3: Classification
          Classification: formData.Classification,

          // Step 4: Needs/Problems
          needsProblems: formData.needsProblems,

          // Step 5: Emergency Contact
          emergencyContact: formData.emergencyContact
        }
      };

      const response = await fetch("http://localhost:8081/submitAllSteps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit form');
      }

      const result = await response.json();
      alert(`Form submitted successfully! Your Code ID is: ${result.codeId}`);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred while submitting the form. Please try again.");
    }
  };

  return (
    <div className="multi-step-form-wrapper">
      <div className="multi-step-form-body">
        <div>
          {step === 1 && (
            <IdentifyingInformation
              nextStep={nextStep}
              updateFormData={updateFormData}
              formData={formData}
            />
          )}
          {step === 2 && (
            <FamilyOccupation
              prevStep={prevStep}
              nextStep={nextStep}
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          {step === 3 && (
            <Classification
              prevStep={prevStep}
              nextStep={nextStep}
              updateFormData={updateFormData}
              formData={formData}
            />
          )}
          {step === 4 && (
            <NeedsProblems
              prevStep={prevStep}
              nextStep={nextStep}
              updateFormData={updateFormData}
              formData={formData}
            />
          )}
          {step === 5 && (
            <InCaseOfEmergency
              prevStep={prevStep}
              updateFormData={updateFormData}
              formData={formData}
              onSubmit={handleFinalSubmit}
            />
          )}
          <div className="pagination">
            {Array.from({ length: totalSteps }, (_, index) => (
              <div
                key={index}
                className={`pagination-dot ${step === index + 1 ? "active" : ""}`}
              ></div>
            ))}
            <p>Step {step} of {totalSteps}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
