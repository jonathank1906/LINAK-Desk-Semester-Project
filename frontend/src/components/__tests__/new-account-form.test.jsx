import { render, screen } from "@testing-library/react";
import { Dialog } from "@radix-ui/react-dialog";
import { NewAccountForm } from "../new-account-form";

describe("NewAccountForm", () => {
  it("renders the form fields", () => {
    render(
      <Dialog open>
        <NewAccountForm />
      </Dialog>
    );
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });
});