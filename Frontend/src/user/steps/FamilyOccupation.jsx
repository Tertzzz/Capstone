import { useForm } from "react-hook-form";
import React, { useEffect } from "react";
import "./FamilyOccupation.css";
import "./shared.css";

export default function FamilyOccupation({ prevStep, nextStep, formData, updateFormData }) {
  const { register, handleSubmit, watch, setValue, formState: { errors }, trigger } = useForm({
    defaultValues: formData
  });

  const numberOfChildren = watch("Number of children") || 0;

  // Clear children data when number of children changes
  useEffect(() => {
    // Clear existing children data when number changes
    const currentChildren = formData.children || [];
    if (currentChildren.length !== numberOfChildren) {
      updateFormData({ 
        ...formData,
        children: Array(parseInt(numberOfChildren)).fill({
          first_name: "",
          middle_name: "",
          last_name: "",
          birthdate: "",
          age: "",
          educational_attainment: ""
        })
      });
    }
  }, [numberOfChildren]);

  const calculateAge = (birthdate) => {
    if (!birthdate) return "";
    const birthDateObj = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  };

  const birthdates = Array.from({ length: numberOfChildren }).map((_, index) =>
    watch(`children[${index}].birthdate`)
  );

  useEffect(() => {
    birthdates.forEach((birthdate, index) => {
      if (birthdate) {
        const age = calculateAge(birthdate);
        setValue(`children[${index}].age`, age);
      }
    });
  }, [birthdates, setValue]);

  const onSubmit = async (data) => {
    const isValid = await trigger();
    if (!isValid) return;
  
    const childrenData = Array.from({ length: numberOfChildren }).map((_, index) => ({
      first_name: data.children?.[index]?.["first_name"] || "",
      middle_name: data.children?.[index]?.["middle_name"] || "",
      last_name: data.children?.[index]?.["last_name"] || "",
      birthdate: data.children?.[index]?.["birthdate"] || "",
      age: data.children?.[index]?.["age"] || "",
      educational_attainment: data.children?.[index]?.["educational_attainment"] || ""
    }));
  
    updateFormData({ 
      ...formData,
      "Number of children": numberOfChildren,
      children: childrenData 
    });
    nextStep();
  };
  
  return (
    <form className="family-form step-form" onSubmit={handleSubmit(onSubmit)}>
      <h2 className="family-header step-header">
        Step 2: Family Occupation and Composition
        <span className="subtitle">(Hanapbuhay at Komposisyon ng Pamilya)</span>
      </h2>

      <div className="family-input-group">
        <label className="form-label step-label">Number of Children</label>
        <input
          className={`form-input step-input ${errors["Number of children"] ? 'error' : ''}`}
          type="number"
          placeholder="Enter number of children"
          {...register("Number of children", {
            required: "This field is required",
            min: { value: 0, message: "Number of children cannot be negative" }
          })}
          onBlur={() => trigger("Number of children")}
        />
        {errors["Number of children"] &&
          <span className="error-message step-error">{errors["Number of children"].message}</span>
        }
      </div>

      {Array.from({ length: numberOfChildren }).map((_, index) => (
        <div key={index} className="child-form">
          <h4>Child {index + 1}</h4>

          <div className="child-section">
            <h5>Full Name</h5>
            <div className="name-row step-row">
              <div>
                <input
                  className="form-input step-input"
                  type="text"
                  placeholder="First name"
                  {...register(`children[${index}].first_name`, { required: "First name is required" })}
                />
                {errors.children?.[index]?.["first_name"] &&
                  <span className="error-message step-error">{errors.children[index]["first_name"].message}</span>
                }
              </div>
              <div>
                <input
                  className="form-input step-input"
                  type="text"
                  placeholder="Middle name"
                  {...register(`children[${index}].middle_name`, { required: "Middle name is required" })}
                />
                {errors.children?.[index]?.["middle_name"] &&
                  <span className="error-message step-error">{errors.children[index]["middle_name"].message}</span>
                }
              </div>
              <div>
                <input
                  className="form-input step-input"
                  type="text"
                  placeholder="Last name"
                  {...register(`children[${index}].last_name`, { required: "Last name is required" })}
                />
                {errors.children?.[index]?.["last_name"] &&
                  <span className="error-message step-error">{errors.children[index]["last_name"].message}</span>
                }
              </div>
            </div>
          </div>

          <div className="child-section">
            <div className="birth-info">
              <div>
                <label className="form-label step-label">Birthdate</label>
                <input
                  className="form-input step-input"
                  type="date"
                  {...register(`children[${index}].birthdate`, {
                    required: "Birthdate is required",
                    validate: value => {
                      const age = calculateAge(value);
                      return age <= 21 || "Child must be 21 years old or younger";
                    }
                  })}
                  onChange={(e) => {
                    const birthdate = e.target.value;
                    if (birthdate) {
                      const age = calculateAge(birthdate);
                      setValue(`children[${index}].age`, age);
                    }
                  }}
                />
                {errors.children?.[index]?.birthdate &&
                  <span className="error-message step-error">{errors.children[index].birthdate.message}</span>
                }
              </div>

              <div>
                <label className="form-label step-label">Age (Auto-Calculated)</label>
                <input
                  className="form-input step-input"
                  type="number"
                  placeholder="Age"
                  {...register(`children[${index}].age`)}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="child-section">
            <h5>Educational Background</h5>
            <input
              className="form-input step-input"
              type="text"
              placeholder="Educational Attainment (N/A if none)"
              {...register(`children[${index}].educational_attainment`, {
                required: "Educational Attainment is required"
              })}
            />
            {errors.children?.[index]?.["educational_attainment"] &&
              <span className="error-message step-error">
                {errors.children[index]["educational_attainment"].message}
              </span>
            }
          </div>
        </div>
      ))}

      <div className="form-buttons">
        <button type="button" className="back-btn step-button" onClick={prevStep}>
          Back
        </button>
        <button type="submit" className="next-btn step-button">
          Next
        </button>
      </div>
    </form>
  );
}
