import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  Building, 
  Gavel,
  FileText,
  Users,
  CheckCircle,
  AlertTriangle,
  Edit
} from 'lucide-react';
import { Case, Hearing } from '@/contexts/LegalDataContext';
import { useLegalData } from '@/contexts/LegalDataContext';
import { useToast } from '@/hooks/use-toast';

interface HearingRecordPopupProps {
  case_: Case | null;
  hearing: Hearing | null;
  isOpen: boolean;
  onClose: () => void;
  onHearingSaved?: () => void; // Add callback for when hearing is saved
  onHearingDeleted?: (hearingId: string) => void; // Add callback for when hearing is deleted
}

interface Order {
  orderType: string;
  orderDetails: string;
  orderDate: Date;
}

export const HearingRecordPopup: React.FC<HearingRecordPopupProps> = ({ 
  case_, 
  hearing, 
  isOpen, 
  onClose,
  onHearingSaved,
  onHearingDeleted 
}) => {
  console.log('HearingRecordPopup: Component rendered with props:', { 
    case_: case_?.id, 
    hearing: hearing?.id, 
    isOpen, 
    hearingData: hearing 
  });
  const { addHearing, updateHearing, deleteHearing } = useLegalData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    hearingDate: '',
    hearingTime: '',
    courtName: '',
    judgeName: '',
    hearingType: 'interim_hearing' as Hearing['hearingType'],
    status: 'scheduled' as Hearing['status'],
    purpose: '',
    courtInstructions: '',
    documentsToBring: [] as string[],
    proceedings: '',
    nextHearingDate: '',
    nextHearingTime: '',
    adjournmentReason: '',
    attendance: {
      clientPresent: false,
      opposingPartyPresent: false,
      witnessesPresent: [] as string[],
    },
    orders: [] as Order[],
    notes: '',
  });

  const [newDocument, setNewDocument] = useState('');
  const [newWitness, setNewWitness] = useState('');
  const [newOrder, setNewOrder] = useState({ orderType: '', orderDetails: '' });
  const todayIsoString = new Date().toISOString().split('T')[0];
  const shouldEnforceFutureDates = !hearing || formData.status === 'scheduled';

  useEffect(() => {
    console.log('HearingRecordPopup: useEffect triggered', { hearing: hearing?.id, case_: case_?.id, isOpen });
    
    if (hearing) {
      // Edit mode - populate form with existing hearing data
      console.log('HearingRecordPopup: Populating form for edit mode with hearing:', hearing);
      
      // Handle date conversion safely
      const hearingDate = hearing.hearingDate instanceof Date 
        ? hearing.hearingDate.toISOString().split('T')[0]
        : new Date(hearing.hearingDate).toISOString().split('T')[0];
        
      const nextHearingDate = hearing.nextHearingDate 
        ? (hearing.nextHearingDate instanceof Date 
            ? hearing.nextHearingDate.toISOString().split('T')[0]
            : new Date(hearing.nextHearingDate).toISOString().split('T')[0])
        : '';
      
      const formDataToSet = {
        hearingDate,
        hearingTime: hearing.hearingTime || '',
        courtName: hearing.courtName,
        judgeName: hearing.judgeName || '',
        hearingType: hearing.hearingType,
        status: hearing.status,
        purpose: hearing.purpose || '',
        courtInstructions: hearing.courtInstructions || '',
        documentsToBring: hearing.documentsToBring || [],
        proceedings: hearing.proceedings || '',
        nextHearingDate,
        nextHearingTime: hearing.nextHearingTime || '',
        adjournmentReason: hearing.adjournmentReason || '',
        attendance: {
          clientPresent: hearing.attendance?.clientPresent || false,
          opposingPartyPresent: hearing.attendance?.opposingPartyPresent || false,
          witnessesPresent: hearing.attendance?.witnessesPresent || [],
        },
        orders: hearing.orders || [],
        notes: hearing.notes || '',
      };
      
      console.log('HearingRecordPopup: Setting form data:', formDataToSet);
      setFormData(formDataToSet);
    } else {
      // Create mode - initialize with case data and reset all fields
      console.log('HearingRecordPopup: Initializing form for create mode');
      setFormData({
        hearingDate: new Date().toISOString().split('T')[0],
        hearingTime: '',
        courtName: case_?.courtName || '',
        judgeName: case_?.judgeName || '',
        hearingType: 'interim_hearing',
        status: 'scheduled',
        purpose: '',
        courtInstructions: '',
        documentsToBring: [],
        proceedings: '',
        nextHearingDate: '',
        nextHearingTime: '',
        adjournmentReason: '',
        attendance: {
          clientPresent: false,
          opposingPartyPresent: false,
          witnessesPresent: [],
        },
        orders: [],
        notes: '',
      });
    }
    
    // Reset additional form fields
    setNewDocument('');
    setNewWitness('');
    setNewOrder({ orderType: '', orderDetails: '' });
  }, [hearing, case_, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!case_) return;

    if (!formData.hearingDate) {
      toast({
        title: 'Validation error',
        description: 'Please select a hearing date',
        variant: 'destructive'
      });
      return;
    }
    if (!formData.courtName.trim()) {
      toast({
        title: 'Validation error',
        description: 'Please enter the court name',
        variant: 'destructive'
      });
      return;
    }

    const parsedHearingDate = new Date(formData.hearingDate);
    if (Number.isNaN(parsedHearingDate.getTime())) {
      toast({
        title: 'Validation error',
        description: 'Please provide a valid hearing date',
        variant: 'destructive'
      });
      return;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const enforceFutureDates = !hearing || formData.status === 'scheduled';
    if (enforceFutureDates && parsedHearingDate < startOfToday) {
      toast({
        title: 'Validation error',
        description: 'Hearing date cannot be in the past while status is scheduled',
        variant: 'destructive'
      });
      return;
    }

    if (formData.nextHearingDate) {
      const parsedNextDate = new Date(formData.nextHearingDate);
      if (Number.isNaN(parsedNextDate.getTime())) {
        toast({
          title: 'Validation error',
          description: 'Please provide a valid next hearing date',
          variant: 'destructive'
        });
        return;
      }
      if (parsedNextDate < startOfToday) {
        toast({
          title: 'Validation error',
          description: 'Next hearing date cannot be in the past',
          variant: 'destructive'
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const hearingData = {
        caseId: case_.id,
        hearingDate: parsedHearingDate,
        hearingTime: formData.hearingTime || undefined,
        courtName: formData.courtName,
        judgeName: formData.judgeName || undefined,
        hearingType: formData.hearingType,
        status: formData.status,
        purpose: formData.purpose || undefined,
        courtInstructions: formData.courtInstructions || undefined,
        documentsToBring: formData.documentsToBring,
        proceedings: formData.proceedings || undefined,
        nextHearingDate: formData.nextHearingDate ? new Date(formData.nextHearingDate) : undefined,
        nextHearingTime: formData.nextHearingTime || undefined,
        adjournmentReason: formData.adjournmentReason || undefined,
        attendance: formData.attendance,
        orders: formData.orders,
        notes: formData.notes || undefined,
      };

      console.log('Saving hearing data:', hearingData);

      if (hearing) {
        console.log('HearingRecordPopup: Updating hearing:', hearing.id);
        console.log('HearingRecordPopup: Update data:', hearingData);
        await updateHearing(hearing.id, hearingData);
        console.log('HearingRecordPopup: Hearing updated successfully');
      } else {
        console.log('HearingRecordPopup: Creating new hearing');
        console.log('HearingRecordPopup: Create data:', hearingData);
        await addHearing(hearingData);
        console.log('HearingRecordPopup: Hearing created successfully');
      }

      // Notify parent that hearing was saved
      if (onHearingSaved) {
        onHearingSaved();
      }

      onClose();
    } catch (error) {
      console.error('Error saving hearing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save hearing. Please try again.';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!hearing || !confirm('Are you sure you want to delete this hearing record?')) return;

    setIsDeleting(true);
    try {
      console.log('HearingRecordPopup: Deleting hearing:', hearing.id);
      await deleteHearing(hearing.id);
      console.log('HearingRecordPopup: Hearing deleted successfully');
      
      // Notify parent that hearing was deleted to trigger immediate UI update
      if (onHearingDeleted) {
        console.log('HearingRecordPopup: Notifying parent of hearing deletion');
        onHearingDeleted(hearing.id);
      }
      
      // Also call the general saved callback for consistency
      if (onHearingSaved) {
        console.log('HearingRecordPopup: Notifying parent of hearing deletion (saved callback)');
        onHearingSaved();
      }
      
      onClose();
    } catch (error) {
      console.error('Error deleting hearing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete hearing. Please try again.';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const addDocument = () => {
    if (newDocument.trim()) {
      setFormData(prev => ({
        ...prev,
        documentsToBring: [...prev.documentsToBring, newDocument.trim()]
      }));
      setNewDocument('');
    }
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documentsToBring: prev.documentsToBring.filter((_, i) => i !== index)
    }));
  };

  const addWitness = () => {
    if (newWitness.trim()) {
      setFormData(prev => ({
        ...prev,
        attendance: {
          ...prev.attendance,
          witnessesPresent: [...prev.attendance.witnessesPresent, newWitness.trim()]
        }
      }));
      setNewWitness('');
    }
  };

  const removeWitness = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attendance: {
        ...prev.attendance,
        witnessesPresent: prev.attendance.witnessesPresent.filter((_, i) => i !== index)
      }
    }));
  };

  const addOrder = () => {
    if (newOrder.orderType.trim() && newOrder.orderDetails.trim()) {
      setFormData(prev => ({
        ...prev,
        orders: [...prev.orders, { ...newOrder, orderDate: new Date() }]
      }));
      setNewOrder({ orderType: '', orderDetails: '' });
    }
  };

  const removeOrder = (index: number) => {
    setFormData(prev => ({
      ...prev,
      orders: prev.orders.filter((_, i) => i !== index)
    }));
  };

  const getHearingTypeLabel = (type: Hearing['hearingType']) => {
    switch (type) {
      case 'first_hearing': return 'First Hearing';
      case 'interim_hearing': return 'Interim Hearing';
      case 'final_hearing': return 'Final Hearing';
      case 'evidence_hearing': return 'Evidence Hearing';
      case 'argument_hearing': return 'Argument Hearing';
      case 'judgment_hearing': return 'Judgment Hearing';
      case 'other': return 'Other';
      default: return type;
    }
  };

  const getStatusLabel = (status: Hearing['status']) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'completed': return 'Completed';
      case 'adjourned': return 'Adjourned';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hearing ? (
              <>
                <Edit className="h-5 w-5" />
                Edit Hearing Record
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Record New Hearing
              </>
            )}
          </DialogTitle>
        </DialogHeader>


        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hearingDate">Hearing Date*</Label>
                  <Input
                    id="hearingDate"
                    type="date"
                    value={formData.hearingDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, hearingDate: e.target.value }))}
                    required
                    min={shouldEnforceFutureDates ? todayIsoString : undefined}
                    className="bg-background text-foreground border-input"
                  />
                </div>
                <div>
                  <Label htmlFor="hearingTime">Hearing Time</Label>
                  <Input
                    id="hearingTime"
                    type="time"
                    value={formData.hearingTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, hearingTime: e.target.value }))}
                    className="bg-background text-foreground border-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="courtName">Court Name*</Label>
                  <Input
                    id="courtName"
                    value={formData.courtName}
                    onChange={(e) => setFormData(prev => ({ ...prev, courtName: e.target.value }))}
                    required
                    className="bg-background text-foreground border-input"
                  />
                </div>
                <div>
                  <Label htmlFor="judgeName">Judge Name</Label>
                  <Input
                    id="judgeName"
                    value={formData.judgeName}
                    onChange={(e) => setFormData(prev => ({ ...prev, judgeName: e.target.value }))}
                    className="bg-background text-foreground border-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hearingType">Hearing Type</Label>
                  <Select value={formData.hearingType} onValueChange={(value) => setFormData(prev => ({ ...prev, hearingType: value as Hearing['hearingType'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_hearing">First Hearing</SelectItem>
                      <SelectItem value="interim_hearing">Interim Hearing</SelectItem>
                      <SelectItem value="final_hearing">Final Hearing</SelectItem>
                      <SelectItem value="evidence_hearing">Evidence Hearing</SelectItem>
                      <SelectItem value="argument_hearing">Argument Hearing</SelectItem>
                      <SelectItem value="judgment_hearing">Judgment Hearing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as Hearing['status'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="adjourned">Adjourned</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="purpose">Purpose of Hearing</Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder="Describe the purpose of this hearing..."
                  rows={2}
                  className="bg-background text-foreground border-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Court Instructions & Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Court Instructions & Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="courtInstructions">Court Instructions for Next Hearing</Label>
                <Textarea
                  id="courtInstructions"
                  value={formData.courtInstructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, courtInstructions: e.target.value }))}
                  placeholder="Any specific instructions from the court..."
                  rows={3}
                  className="bg-background text-foreground border-input"
                />
              </div>

              <div>
                <Label>Documents to Bring for Next Hearing</Label>
                <div className="space-y-2">
                  {formData.documentsToBring.map((doc, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline" className="flex-1 justify-start">
                        <FileText className="h-3 w-3 mr-1" />
                        {doc}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => removeDocument(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newDocument}
                      onChange={(e) => setNewDocument(e.target.value)}
                      placeholder="Add document name..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDocument())}
                      className="bg-background text-foreground border-input"
                    />
                    <Button type="button" onClick={addDocument}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Proceedings & Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Proceedings & Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="proceedings">What Happened During the Hearing</Label>
                <Textarea
                  id="proceedings"
                  value={formData.proceedings}
                  onChange={(e) => setFormData(prev => ({ ...prev, proceedings: e.target.value }))}
                  placeholder="Describe what happened during the hearing..."
                  rows={4}
                  className="bg-background text-foreground border-input"
                />
              </div>

              <div>
                <Label>Court Orders</Label>
                <div className="space-y-2">
                  {formData.orders.map((order, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{order.orderType}</Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => removeOrder(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{order.orderDetails}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.orderDate).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  ))}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newOrder.orderType}
                        onChange={(e) => setNewOrder(prev => ({ ...prev, orderType: e.target.value }))}
                        placeholder="Order type (e.g., Interim Order)"
                        className="bg-background text-foreground border-input"
                      />
                      <Input
                        value={newOrder.orderDetails}
                        onChange={(e) => setNewOrder(prev => ({ ...prev, orderDetails: e.target.value }))}
                        placeholder="Order details..."
                        className="bg-background text-foreground border-input"
                      />
                      <Button type="button" onClick={addOrder}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clientPresent"
                  checked={formData.attendance.clientPresent}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    attendance: { ...prev.attendance, clientPresent: !!checked }
                  }))}
                />
                <Label htmlFor="clientPresent">Client was present</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="opposingPartyPresent"
                  checked={formData.attendance.opposingPartyPresent}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    attendance: { ...prev.attendance, opposingPartyPresent: !!checked }
                  }))}
                />
                <Label htmlFor="opposingPartyPresent">Opposing party was present</Label>
              </div>

              <div>
                <Label>Witnesses Present</Label>
                <div className="space-y-2">
                  {formData.attendance.witnessesPresent.map((witness, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline" className="flex-1 justify-start">
                        <Users className="h-3 w-3 mr-1" />
                        {witness}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => removeWitness(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newWitness}
                      onChange={(e) => setNewWitness(e.target.value)}
                      placeholder="Add witness name..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addWitness())}
                      className="bg-background text-foreground border-input"
                    />
                    <Button type="button" onClick={addWitness}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Hearing & Adjournment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next Hearing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nextHearingDate">Next Hearing Date</Label>
                  <Input
                    id="nextHearingDate"
                    type="date"
                    value={formData.nextHearingDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, nextHearingDate: e.target.value }))}
                    min={todayIsoString}
                    className="bg-background text-foreground border-input"
                  />
                </div>
                <div>
                  <Label htmlFor="nextHearingTime">Next Hearing Time</Label>
                  <Input
                    id="nextHearingTime"
                    type="time"
                    value={formData.nextHearingTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, nextHearingTime: e.target.value }))}
                    className="bg-background text-foreground border-input"
                  />
                </div>
              </div>

              {formData.status === 'adjourned' && (
                <div>
                  <Label htmlFor="adjournmentReason">Reason for Adjournment</Label>
                  <Textarea
                    id="adjournmentReason"
                    value={formData.adjournmentReason}
                    onChange={(e) => setFormData(prev => ({ ...prev, adjournmentReason: e.target.value }))}
                    placeholder="Reason for adjourning the hearing..."
                    rows={2}
                    className="bg-background text-foreground border-input"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes or observations..."
                rows={3}
                className="bg-background text-foreground border-input"
              />
            </CardContent>
          </Card>

          <DialogFooter className="flex justify-between">
            <div>
              {hearing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Hearing'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : hearing ? 'Update Hearing' : 'Save Hearing'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
