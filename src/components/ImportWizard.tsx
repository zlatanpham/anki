"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Brain,
  Tag,
} from "lucide-react";

interface ImportWizardProps {
  onImportSuccess?: (deckId: string) => void;
  organizationId?: string;
}

interface ImportPreview {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  cardCount: number;
  deckName: string;
  preview: {
    deckInfo: {
      name: string;
      description?: string;
      cardCount: number;
    };
    sampleCards: Array<{
      index: number;
      cardType: "BASIC" | "CLOZE";
      front: string;
      back: string;
      tags: string[];
    }>;
  };
}

export function ImportWizard({
  onImportSuccess,
  organizationId,
}: ImportWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "import">("upload");
  const [jsonData, setJsonData] = useState<string>("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate import mutation
  const validateImport = api.import.validateImport.useMutation({
    onSuccess: (data) => {
      setPreview(data);
      setStep("preview");
    },
    onError: (error) => {
      toast.error(`Validation failed: ${error.message}`);
    },
  });

  // Import deck mutation
  const importDeck = api.import.importDeck.useMutation({
    onSuccess: (result) => {
      toast.success(`Successfully imported ${result.cardsImported} cards!`);
      if (result.warnings.length > 0) {
        result.warnings.forEach((warning) => toast.warning(warning));
      }
      if (onImportSuccess && result.deckId) {
        onImportSuccess(result.deckId);
      }
      handleClose();
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Please select a JSON file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonData(content);
      validateImport.mutate({ jsonData: content });
    };
    reader.readAsText(file);
  };

  const handleTextImport = () => {
    if (!jsonData.trim()) {
      toast.error("Please paste JSON data");
      return;
    }
    validateImport.mutate({ jsonData });
  };

  const handleImport = () => {
    if (!jsonData) return;
    setStep("import");
    importDeck.mutate({
      jsonData,
      organizationId,
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep("upload");
    setJsonData("");
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import Deck
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Deck from JSON</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* File Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload JSON File
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-muted-foreground text-sm">
                      Select a JSON file exported from this application or
                      compatible formats.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Text Import */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Paste JSON Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <textarea
                      placeholder="Paste your JSON data here..."
                      value={jsonData}
                      onChange={(e) => setJsonData(e.target.value)}
                      className="h-32 w-full resize-none rounded-md border p-3 font-mono text-sm"
                    />
                    <Button
                      onClick={handleTextImport}
                      disabled={!jsonData.trim() || validateImport.isPending}
                      className="w-full"
                    >
                      {validateImport.isPending
                        ? "Validating..."
                        : "Validate JSON"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Supported formats:</strong> JSON files exported from
                this application. The import will create a new deck with all
                cards from the JSON file.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-6">
            {/* Validation Status */}
            <div className="flex items-center gap-2">
              {preview.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                {preview.isValid ? "Valid Import Data" : "Invalid Import Data"}
              </span>
            </div>

            {/* Errors */}
            {preview.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Errors found:</strong>
                    <ul className="list-disc space-y-1 pl-4">
                      {preview.errors.map((error, index) => (
                        <li key={index} className="text-sm">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Warnings:</strong>
                    <ul className="list-disc space-y-1 pl-4">
                      {preview.warnings.map((warning, index) => (
                        <li key={index} className="text-sm">
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Deck Preview */}
            {preview.isValid && (
              <Card>
                <CardHeader>
                  <CardTitle>Import Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium">Deck Name</Label>
                      <p className="text-muted-foreground text-sm">
                        {preview.preview.deckInfo.name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Card Count</Label>
                      <p className="text-muted-foreground text-sm">
                        {preview.preview.deckInfo.cardCount} cards
                      </p>
                    </div>
                  </div>

                  {preview.preview.deckInfo.description && (
                    <div>
                      <Label className="text-sm font-medium">Description</Label>
                      <p className="text-muted-foreground text-sm">
                        {preview.preview.deckInfo.description}
                      </p>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <Label className="mb-3 block text-sm font-medium">
                      Sample Cards
                    </Label>
                    <div className="space-y-3">
                      {preview.preview.sampleCards.map((card) => (
                        <div key={card.index} className="rounded-lg border p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <Badge
                              variant={
                                card.cardType === "BASIC"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {card.cardType === "BASIC" ? (
                                <>
                                  <FileText className="mr-1 h-3 w-3" />
                                  Basic
                                </>
                              ) : (
                                <>
                                  <Brain className="mr-1 h-3 w-3" />
                                  Cloze
                                </>
                              )}
                            </Badge>
                            {card.tags.length > 0 && (
                              <div className="flex gap-1">
                                {card.tags.map((tag, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    <Tag className="mr-1 h-2 w-2" />
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="grid gap-2 text-sm md:grid-cols-2">
                            <div>
                              <strong>Front:</strong> {card.front}
                            </div>
                            <div>
                              <strong>Back:</strong> {card.back}
                            </div>
                          </div>
                        </div>
                      ))}
                      {preview.preview.deckInfo.cardCount > 3 && (
                        <p className="text-muted-foreground text-center text-sm">
                          ... and {preview.preview.deckInfo.cardCount - 3} more
                          cards
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {step === "import" && (
          <div className="py-8 text-center">
            <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
            <p className="text-muted-foreground">Importing deck...</p>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              {preview?.isValid && (
                <Button onClick={handleImport} disabled={importDeck.isPending}>
                  Import Deck
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
