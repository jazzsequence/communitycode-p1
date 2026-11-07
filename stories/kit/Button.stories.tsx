import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Fragment } from "react";
import { ButtonBlock, type ButtonProps } from "@/components/puck/blocks/button/button.block";
import { kit } from "../_helpers/kit-content";

const meta = {
  title: "Kit blocks/Button",
  parameters: {
    docs: {
      description: {
        component:
          "A standalone call to action. Variants map onto the site's tokens: primary is the apricot action, secondary the raised neutral.",
      },
    },
  },
  render: (args) => kit(ButtonBlock, args),
  args: { label: "Get started", href: "#", variant: "primary", align: "left" },
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary", "yellow", "purple"] },
    align: { control: "inline-radio", options: ["left", "center"] },
  },
} satisfies Meta<ButtonProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: "secondary", label: "Read the transcript" } };
export const Yellow: Story = { args: { variant: "yellow" } };
export const Purple: Story = { args: { variant: "purple" } };
export const Centered: Story = { args: { align: "center" } };
export const NoLink: Story = { args: { href: "", label: "No link set" } };
export const AllVariants: Story = {
  render: () => (
    <>
      {(["primary", "secondary", "yellow", "purple"] as const).map((variant) => (
        <Fragment key={variant}>{kit(ButtonBlock, { variant, label: variant, href: "#" })}</Fragment>
      ))}
    </>
  ),
};
