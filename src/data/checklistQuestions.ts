import { ChecklistQuestion } from "@/types";

export const checklistQuestions: ChecklistQuestion[] = [
  // Financial Relationships
  {
    id: "fin-1",
    category: "Financial Relationships",
    question: "I and my immediate family members (spouse, spousal equivalent or dependent (any person who received more than half of his/her support for the most recent calendar year from the relevant person)) and my Immediate relatives (spouse, parent, sibling and children any of whom is either dependent financially or consults such a person in taking decisions related to trading in securities) do not have any financial interests (shares, mutual funds, bonds, debentures, company deposits, etc.)/Security/Interest with [Entity Name and Code] and/or its Related Entities (include Holding, Shareholders holding 20-50% shareholding, Subsidiaries, Entities under Common Control, Associates including JVs), Connected Entities and other side entities (e.g. target/seller on an M&A transaction) involved."
  },
  {
    id: "fin-2",
    category: "Financial Relationships",
    question: "I and my immediate family members, do not have any of the following relationships with [Entity Name and Code] and/or its Related Entities and other side entities involved:\n- Securities account\n- Insurance products\n- Loans / mortgages\n- Credit cards\n- Guarantee or security provided, in connection with the indebtedness of any third person\n- Bank accounts / fixed deposits with banks, which are under normal terms or conditions\n- Other relationships"
  },
  {
    id: "fin-3",
    category: "Financial Relationships",
    question: "My Close Family Members (parent, child or sibling who is not an Immediate Family Member) do not hold beneficial ownership of more than 5% in [Entity Name and Code] and/or its Related Entities."
  },
  // Employment Relationships
  {
    id: "emp-1",
    category: "Employment Relationships",
    question: "I have not been employed by or did not serve as an Officer or Director on the board or similar management or governing body of [Entity Name and Code] and/or its Related Entities and other side entities involved."
  },
  {
    id: "emp-2",
    category: "Employment Relationships",
    question: "I did not enter into employment negotiations with [Entity Name and Code] and/or its Related Entities and other side entities involved."
  },
  {
    id: "emp-3",
    category: "Employment Relationships",
    question: "My immediate family members and close family members are not employed with [Entity Name and Code] and/or its Related Entities and other side entities involved."
  },
  // Business Relationships
  {
    id: "bus-1",
    category: "Business Relationships",
    question: "I and my Immediate Family members do not have any business relationships with [Entity Name and Code] and/or its Related Entities and other side entities involved or its management or Officer or Director or substantial shareholder."
  },
  {
    id: "bus-2",
    category: "Business Relationships",
    question: "I and my immediate family members did not obtain a purchase discount which is not widely available to others, or accept a gift or hospitality, unless the value is trivial and inconsequential, from [Entity Name and Code] and/or its Related Entities and other side entities involved or its management or Officer or Director or Substantial shareholder."
  },
  // Close Personal Relationships
  {
    id: "per-1",
    category: "Close Personal Relationships",
    question: "I am not aware that others with whom I have a close personal relationship owning a Material Direct or Material Indirect Financial Interest in [Entity Name and Code] or its Related Entities."
  },
  // Other Conflicts
  {
    id: "oth-1",
    category: "Other Conflicts",
    question: "I am not aware of any other conflicts in relation to this engagement which could affect the independence, e.g., potential conflict, exclusivity, personal conflict, etc."
  },
  // Closing Confirmation
  {
    id: "clo-1",
    category: "Closing Confirmation",
    question: "I confirm that the above information is correct. If there is any change in any of the above declarations from the date of this confirmation till the 30th of September, [Year] of [Entity Name and Code] and/or its Related Entities and other side entities for such financial year is concluded or end date of 'Closed Window Period', whichever is later, then I will edit my responses in the EDS tool as soon as the change occurs. Also, if I am rendering services to [Entity Name and Code] on continuous basis, then I will ensure compliance with Independence requirements till the AGM date when we cease to be the auditor of [Entity Name and Code] and/or its Related Entities."
  },
  {
    id: "clo-2",
    category: "Closing Confirmation",
    question: "I will not trade in [Entity Name and Code] or its Connected Entities during the Closed Window Period."
  },
  {
    id: "clo-3",
    category: "Closing Confirmation",
    question: "I hereby confirm that I have read and understood the SEBI (Prohibition of Insider Trading) Regulations, 2015 and amendments thereof and accordingly agree and confirm that the same shall be binding on me and my Immediate Relative(s)."
  },
  {
    id: "clo-4",
    category: "Closing Confirmation",
    question: "I hereby confirm that I have declared all the holdings and trading / other transactions in securities in my name and / or in the name of my Immediate Relative(s)."
  },
  {
    id: "clo-5",
    category: "Closing Confirmation",
    question: "I hereby also declare that the declarations given are true to my belief and sense. I shall be solely responsible if the declarations are found to incorrect at a later stage."
  },
  {
    id: "clo-6",
    category: "Closing Confirmation",
    question: "I am aware that I shall be liable to face penal consequences as set forth including disciplinary action by the firm in the event of violation of the Code."
  },
  {
    id: "clo-7",
    category: "Closing Confirmation",
    question: "I confirm that I shall handle all information on a need-to-know basis and shall not disclose any Unpublished Prive Sensitive Information (UPSI) to any person (including to any of my relatives) except in furtherance of legitimate purpose, performance of duties and discharge of legal obligation."
  },
  {
    id: "clo-8",
    category: "Closing Confirmation",
    question: "I confirm that the information appearing in the information database relating to myself, my immediate relatives and persons with whom I have Material Financial Relationship is correct."
  }
];
