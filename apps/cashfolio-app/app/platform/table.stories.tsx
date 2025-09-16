import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

const meta = {
  component: Table,
  subcomponents: { TableHead, TableRow, TableHeader, TableBody, TableCell },
  render: (args) => (
    <Table {...args}>
      <TableHead>
        <TableRow>
          <TableHeader>Name</TableHeader>
          <TableHeader>Email</TableHeader>
          <TableHeader>Role</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.handle}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell className="text-neutral-500">{user.access}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
} satisfies Meta<typeof Table>;

const users = [
  {
    handle: "jdoe",
    name: "John Doe",
    email: "john.doe@example.com",
    access: "Admin",
  },
  {
    handle: "asmith",
    name: "Alice Smith",
    email: "alice.smith@example.com",
    access: "Editor",
  },
  {
    handle: "bwayne",
    name: "Bruce Wayne",
    email: "bruce.wayne@example.com",
    access: "Viewer",
  },
  {
    handle: "ckent",
    name: "Clark Kent",
    email: "clark.kent@example.com",
    access: "Editor",
  },
  {
    handle: "dprince",
    name: "Diana Prince",
    email: "diana.prince@example.com",
    access: "Admin",
  },
  {
    handle: "pparker",
    name: "Peter Parker",
    email: "peter.parker@example.com",
    access: "Viewer",
  },
];

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };

export const FullWidth: Story = {
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className="p-5">
        <Story />
      </div>
    ),
  ],
  args: {
    ...Default.args,
    bleed: true,
    className: "[--gutter:--spacing(5)]",
  },
};

export const Dense: Story = { args: { ...Default.args, dense: true } };

export const Grid: Story = { args: { ...Default.args, grid: true } };

export const Striped: Story = { args: { ...Default.args, striped: true } };

export const FixedLayout: Story = {
  args: { ...Default.args, fixedLayout: true },
};

export const WithRowLinks: Story = {
  args: { ...Default.args },
  render: (args) => (
    <Table {...args}>
      <TableHead>
        <TableRow>
          <TableHeader>Name</TableHeader>
          <TableHeader>Email</TableHeader>
          <TableHeader>Role</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.handle} href="#">
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell className="text-neutral-500">{user.access}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const Light: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "light" } },
};

export const Dark: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "dark" } },
};
