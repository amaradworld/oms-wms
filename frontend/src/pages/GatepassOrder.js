import React, { useState } from 'react';
import { FileText, Download, Upload, AlertCircle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';

const GatepassOrder = () => {
  const [openSection, setOpenSection] = useState('process');

  const toggleSection = (id) => {
    setOpenSection(prev => prev === id ? null : id);
  };

  const Section = ({ id, title, children }) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <button onClick={() => toggleSection(id)} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors">
        <h3 className="font-semibold text-sm text-slate-800">{title}</h3>
        {openSection === id ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>
      {openSection === id && <div className="px-4 pb-4 text-sm text-slate-600 space-y-2 border-t border-slate-100 pt-3">{children}</div>}
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><FileText size={24} /> Gatepass Order (GPO)</h1>
      <p className="text-sm text-slate-500">Gatepass Orders collect SKUs from warehouse storage for dispatch to vendors, customers, or partners. Created via CSV import.</p>

      {/* Process Notes */}
      <div className="space-y-3">
        <Section id="process" title="Process Notes">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-slate-700 mb-1">What is a Gatepass Order?</h4>
              <p>It is an internal order provisioned to collect SKUs from the warehouse storage area for sending out to vendors, customers or partners. The seller can create an order for all SKUs that need to be sent out of the warehouse. Once all SKUs are retrieved, create a Gatepass and mention the Gatepass Order code in details to map both.</p>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 mb-1">Procedure</h4>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Go to <strong>Tools &gt; Import &gt; GatePass Order &gt; Create New</strong>.</li>
                <li>Click <strong>Download CSV format</strong> to download the template file.</li>
                <li>Enter the details in the appropriate columns (see Field Description table below).</li>
                <li>Click <strong>Choose File</strong> to select the completed CSV file from your computer.</li>
                <li>Click <strong>Upload File</strong> to upload and process the import.</li>
                <li>Click the <strong>Import icon</strong> to check the import status.</li>
                <li>If errors occur, download the failed file, correct the values, and re-import.</li>
                <li>After successful import, view the Gatepass Order and retrieve SKUs from storage.</li>
                <li>Create a <strong>Gatepass</strong> referencing the Gatepass Order code to dispatch.</li>
              </ol>
            </div>
          </div>
        </Section>

        <Section id="fields" title="CSV Field Descriptions">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase">
                  <th className="pb-2 pr-4 font-semibold">Field Name</th>
                  <th className="pb-2 pr-4 font-semibold">Mandatory</th>
                  <th className="pb-2 pr-4 font-semibold">Values</th>
                  <th className="pb-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr><td className="py-2 pr-4 font-mono text-[11px]">Gatepassorder No</td><td className="py-2 pr-4 text-red-500 font-medium">M</td><td className="py-2 pr-4">Alphanumeric</td><td className="py-2">Enter a valid gatepass order code.</td></tr>
                <tr><td className="py-2 pr-4 font-mono text-[11px]">Gatepass Type</td><td className="py-2 pr-4 text-red-500 font-medium">M</td><td className="py-2 pr-4">RETURN_TO_VENDOR<br/>RETURNABLE<br/>NON_RETURNABLE<br/>STOCK_TRANSFER</td><td className="py-2">Select the applicable gatepass type.</td></tr>
                <tr><td className="py-2 pr-4 font-mono text-[11px]">To Party</td><td className="py-2 pr-4 text-red-500 font-medium">M</td><td className="py-2 pr-4">Alphanumeric</td><td className="py-2">For stock transfer: destination facility code. For other types: vendor code.</td></tr>
                <tr><td className="py-2 pr-4 font-mono text-[11px]">Expected Date</td><td className="py-2 pr-4 text-red-500 font-medium">M</td><td className="py-2 pr-4">DD-MM-YYYY</td><td className="py-2">Date by which SKUs should be dispatched.</td></tr>
                <tr><td className="py-2 pr-4 font-mono text-[11px]">SKU Code</td><td className="py-2 pr-4 text-slate-400"></td><td className="py-2 pr-4">Alphanumeric</td><td className="py-2">SKU code(s) to be picked from storage racks.</td></tr>
                <tr><td className="py-2 pr-4 font-mono text-[11px]">Inventory Type</td><td className="py-2 pr-4 text-slate-400"></td><td className="py-2 pr-4">GOOD_INVENTORY<br/>BAD_INVENTORY<br/>QC_REJECTED</td><td className="py-2">Type of inventory to pick.</td></tr>
                <tr><td className="py-2 pr-4 font-mono text-[11px]">Quantity</td><td className="py-2 pr-4 text-slate-400"></td><td className="py-2 pr-4">Numeric</td><td className="py-2">Quantity of SKUs to pick and send.</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="types" title="Gatepass Types Explained">
          <div className="space-y-3">
            <div><h4 className="font-medium text-slate-700">RETURN_TO_VENDOR</h4><p className="text-xs text-slate-500 mt-0.5">Return goods back to the original supplier or vendor.</p></div>
            <div><h4 className="font-medium text-slate-700">RETURNABLE</h4><p className="text-xs text-slate-500 mt-0.5">Items sent out that are expected to be returned (e.g., exhibition samples, loaned items).</p></div>
            <div><h4 className="font-medium text-slate-700">NON_RETURNABLE</h4><p className="text-xs text-slate-500 mt-0.5">Items sent out permanently with no expected return.</p></div>
            <div><h4 className="font-medium text-slate-700">STOCK_TRANSFER</h4><p className="text-xs text-slate-500 mt-0.5">Transfer stock between facilities/warehouses. Destination facility code goes in To Party.</p></div>
          </div>
        </Section>

        <Section id="errors" title="Handling Import Errors">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p>In case of incorrect data, the import will show an <strong>Error</strong>. Download the failed file and open it to see the error details per row. Update the value(s) in the appropriate cell(s) and re-import the file.</p>
              <p className="mt-2 text-xs text-slate-400">Common errors: missing mandatory fields, invalid date format, incorrect gatepass type value.</p>
            </div>
          </div>
        </Section>

        <Section id="next" title="Next Steps After Import">
          <div className="flex items-start gap-2">
            <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p>Once the Gatepass Order is successfully created, proceed to:</p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Navigate to the Gatepass Order under <strong>Outbound &gt; Gatepass Order</strong>.</li>
                <li>Retrieve the listed SKUs from warehouse storage racks.</li>
                <li>Go to <strong>Outbound &gt; Gatepass</strong> and create a new Gatepass.</li>
                <li>Reference the Gatepass Order code in the Gatepass details to map them.</li>
                <li>Dispatch the goods through the Gatepass workflow (Approve → Dispatch → Receive).</li>
              </ol>
            </div>
          </div>
        </Section>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Download size={14} /> Download CSV Template
        </button>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
          <Upload size={14} /> Upload CSV
        </button>
      </div>
    </div>
  );
};

export default GatepassOrder;
