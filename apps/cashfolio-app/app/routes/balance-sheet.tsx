import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from "~/catalyst/table";

export default function BalanceSheet() {
  return (
    <div className="grid grid-cols-2 gap-12">
      <Table dense bleed grid striped>
        <TableHead>
          <TableRow>
            <TableHeader>Assets</TableHeader>
            <TableHeader align="right">CHF 30'000</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Cash</TableCell>
            <TableCell align="right">CHF 10'000</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <span className="pl-8">Account A</span>
            </TableCell>
            <TableCell align="right">CHF 2'000</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <span className="pl-8">Account B</span>
            </TableCell>
            <TableCell align="right">CHF 2'000</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <span className="pl-8">Category C</span>
            </TableCell>
            <TableCell align="right">CHF 2'000</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <span className="pl-16">Account D</span>
            </TableCell>
            <TableCell align="right">CHF 2'000</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <span className="pl-16">Account E</span>
            </TableCell>
            <TableCell align="right">CHF 2'000</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Receivable</TableCell>
            <TableCell align="right">CHF 5'000</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div className="space-y-12">
        <Table bleed dense grid striped>
          <TableHead>
            <TableRow>
              <TableHeader>Liabilities</TableHeader>
              <TableHeader align="right">CHF 2'000</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Credit Card</TableCell>
              <TableCell align="right">CHF 1'400</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Other Loan</TableCell>
              <TableCell align="right">CHF 600</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Table dense bleed grid striped>
          <TableHead>
            <TableRow>
              <TableHeader>Net Worth</TableHeader>
              <TableHeader align="right">CHF 28'000</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Opening Balance 2024</TableCell>
              <TableCell align="right">CHF 23'000</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Profit 2024</TableCell>
              <TableCell align="right">CHF 7'000</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
