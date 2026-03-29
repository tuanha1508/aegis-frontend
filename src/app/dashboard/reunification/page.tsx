"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { icons } from "@/lib/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApi } from "@/lib/use-api";
import {
  getMissing,
  reportMissing,
  getFound,
  reportFound,
  getMatches,
  reviewMatch,
} from "@/lib/api";

export default function ReunificationPage() {
  const { data: missing, refetch: refetchMissing } = useApi(getMissing);
  const { data: found, refetch: refetchFound } = useApi(getFound);
  const { data: matches, refetch: refetchMatches } = useApi(getMatches);

  const [missingForm, setMissingForm] = useState({
    name: "",
    reported_by: "",
    age: "",
    description: "",
    last_known_location: "",
  });
  const [foundForm, setFoundForm] = useState({
    name: "",
    description: "",
    found_at: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleReportMissing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!missingForm.name || !missingForm.reported_by) return;
    setSubmitting(true);
    try {
      await reportMissing({
        name: missingForm.name,
        reported_by: missingForm.reported_by,
        age: missingForm.age ? parseInt(missingForm.age) : undefined,
        description: missingForm.description || undefined,
        last_known_location: missingForm.last_known_location || undefined,
      });
      setMissingForm({
        name: "",
        reported_by: "",
        age: "",
        description: "",
        last_known_location: "",
      });
      refetchMissing();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportFound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundForm.name) return;
    setSubmitting(true);
    try {
      await reportFound({
        name: foundForm.name,
        description: foundForm.description || undefined,
        found_at: foundForm.found_at || undefined,
      });
      setFoundForm({ name: "", description: "", found_at: "" });
      refetchFound();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">
          Family Reunification
        </h1>
        <p className="text-sm text-foreground-secondary mt-0.5">
          Report missing or found persons and view potential matches
        </p>
      </div>

      {/* Matches banner */}
      {matches && matches.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Icon icon={icons.link} className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">
              {matches.length} potential match
              {matches.length > 1 ? "es" : ""} found
            </p>
            <p className="text-xs text-emerald-700">
              The system has identified possible connections between missing and
              found persons.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="missing">
        <TabsList className="mb-6">
          <TabsTrigger value="missing" className="gap-2">
            <Icon icon={icons.userPlus} className="h-3.5 w-3.5" />
            Missing ({missing?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="found" className="gap-2">
            <Icon icon={icons.userCheck} className="h-3.5 w-3.5" />
            Found ({found?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="matches" className="gap-2">
            <Icon icon={icons.link} className="h-3.5 w-3.5" />
            Matches ({matches?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Missing tab */}
        <TabsContent value="missing" className="space-y-4">
          <form
            onSubmit={handleReportMissing}
            className="bg-surface rounded-xl border border-border p-5"
          >
            <p className="text-sm font-medium text-foreground mb-3">
              Report a missing person
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <Input
                placeholder="Person's name *"
                value={missingForm.name}
                onChange={(e) =>
                  setMissingForm({ ...missingForm, name: e.target.value })
                }
                className="text-sm"
              />
              <Input
                placeholder="Your name *"
                value={missingForm.reported_by}
                onChange={(e) =>
                  setMissingForm({
                    ...missingForm,
                    reported_by: e.target.value,
                  })
                }
                className="text-sm"
              />
              <Input
                placeholder="Age"
                type="number"
                value={missingForm.age}
                onChange={(e) =>
                  setMissingForm({ ...missingForm, age: e.target.value })
                }
                className="text-sm"
              />
              <Input
                placeholder="Last known location"
                value={missingForm.last_known_location}
                onChange={(e) =>
                  setMissingForm({
                    ...missingForm,
                    last_known_location: e.target.value,
                  })
                }
                className="text-sm"
              />
            </div>
            <Input
              placeholder="Description (appearance, clothing, etc.)"
              value={missingForm.description}
              onChange={(e) =>
                setMissingForm({
                  ...missingForm,
                  description: e.target.value,
                })
              }
              className="text-sm mb-3"
            />
            <Button
              type="submit"
              disabled={
                !missingForm.name || !missingForm.reported_by || submitting
              }
              size="sm"
              className="rounded-lg bg-foreground text-foreground-inverse hover:bg-foreground/80"
            >
              Report Missing
            </Button>
          </form>

          {missing?.map((person) => (
            <div
              key={person.id}
              className="bg-surface rounded-xl border border-border p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-foreground">
                      {person.name}
                    </h3>
                    {person.age && (
                      <span className="text-xs text-foreground-secondary">
                        Age {person.age}
                      </span>
                    )}
                  </div>
                  {person.description && (
                    <p className="text-sm text-foreground-secondary mb-2">
                      {person.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-[10px] text-foreground-secondary/60">
                    {person.last_known_location && (
                      <span>Last seen: {person.last_known_location}</span>
                    )}
                    <span>Reported by: {person.reported_by}</span>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700 shrink-0"
                >
                  {person.status}
                </Badge>
              </div>
            </div>
          ))}

          {(!missing || missing.length === 0) && (
            <div className="text-center py-8">
              <Icon icon={icons.users} className="h-8 w-8 text-[#E8E5E0] mx-auto mb-2" />
              <p className="text-sm text-foreground-secondary">
                No missing person reports
              </p>
            </div>
          )}
        </TabsContent>

        {/* Found tab */}
        <TabsContent value="found" className="space-y-4">
          <form
            onSubmit={handleReportFound}
            className="bg-surface rounded-xl border border-border p-5"
          >
            <p className="text-sm font-medium text-foreground mb-3">
              Report a found person
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <Input
                placeholder="Person's name *"
                value={foundForm.name}
                onChange={(e) =>
                  setFoundForm({ ...foundForm, name: e.target.value })
                }
                className="text-sm"
              />
              <Input
                placeholder="Found at (location)"
                value={foundForm.found_at}
                onChange={(e) =>
                  setFoundForm({ ...foundForm, found_at: e.target.value })
                }
                className="text-sm"
              />
            </div>
            <Input
              placeholder="Description (appearance, condition, etc.)"
              value={foundForm.description}
              onChange={(e) =>
                setFoundForm({ ...foundForm, description: e.target.value })
              }
              className="text-sm mb-3"
            />
            <Button
              type="submit"
              disabled={!foundForm.name || submitting}
              size="sm"
              className="rounded-lg bg-foreground text-foreground-inverse hover:bg-foreground/80"
            >
              Report Found
            </Button>
          </form>

          {found?.map((person) => (
            <div
              key={person.id}
              className="bg-surface rounded-xl border border-border p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">
                    {person.name}
                  </h3>
                  {person.description && (
                    <p className="text-sm text-foreground-secondary mb-2">
                      {person.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-[10px] text-foreground-secondary/60">
                    {person.found_at && <span>Found at: {person.found_at}</span>}
                    {person.age_approx && (
                      <span>Approx age: {person.age_approx}</span>
                    )}
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 shrink-0"
                >
                  Found
                </Badge>
              </div>
            </div>
          ))}

          {(!found || found.length === 0) && (
            <div className="text-center py-8">
              <Icon icon={icons.userCheck} className="h-8 w-8 text-[#E8E5E0] mx-auto mb-2" />
              <p className="text-sm text-foreground-secondary">No found person reports</p>
            </div>
          )}
        </TabsContent>

        {/* Matches tab */}
        <TabsContent value="matches" className="space-y-4">
          {matches?.map((match) => (
            <div
              key={match.id}
              className="bg-surface rounded-xl border border-border p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-2 py-0.5 ${
                    match.confidence >= 0.8
                      ? "bg-emerald-50 text-emerald-700"
                      : match.confidence >= 0.5
                        ? "bg-amber-50 text-amber-700"
                        : "bg-surface text-foreground-secondary"
                  }`}
                >
                  {Math.round(match.confidence * 100)}% confidence
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  {match.status}
                </Badge>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-red-50/50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-red-600 mb-1">
                    Missing #{match.missing_id}
                  </p>
                  <p className="text-sm text-foreground">
                    {missing?.find((m) => m.id === match.missing_id)?.name ??
                      `ID: ${match.missing_id}`}
                  </p>
                </div>
                <div className="bg-emerald-50/50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-600 mb-1">
                    Found #{match.found_id}
                  </p>
                  <p className="text-sm text-foreground">
                    {found?.find((f) => f.id === match.found_id)?.name ??
                      `ID: ${match.found_id}`}
                  </p>
                </div>
              </div>
              {match.match_factors && (
                <p className="text-xs text-foreground-secondary mt-3">
                  Factors: {match.match_factors}
                </p>
              )}
              {match.status === "pending" && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={async () => {
                      await reviewMatch(match.id, "confirmed");
                      refetchMatches();
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={async () => {
                      await reviewMatch(match.id, "rejected");
                      refetchMatches();
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-foreground-secondary hover:bg-surface transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
              {match.status === "confirmed" && (
                <p className="text-xs text-emerald-600 font-medium mt-3">
                  Confirmed
                </p>
              )}
              {match.status === "rejected" && (
                <p className="text-xs text-foreground-muted line-through mt-3">
                  Rejected
                </p>
              )}
            </div>
          ))}

          {(!matches || matches.length === 0) && (
            <div className="text-center py-8">
              <Icon icon={icons.link} className="h-8 w-8 text-[#E8E5E0] mx-auto mb-2" />
              <p className="text-sm text-foreground-secondary">No matches</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
