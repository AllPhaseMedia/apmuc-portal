"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import { RoleSelect } from "@/components/admin/role-select";
import {
  EditUserDialog,
  DeleteUserButton,
} from "@/components/admin/user-dialogs";
import { UserTags } from "@/components/admin/user-tags";
import type { ClerkUserInfo } from "@/actions/admin/impersonate";
import { format } from "date-fns";
import { Pencil, Trash2, Search, Filter, X } from "lucide-react";

type Props = {
  users: ClerkUserInfo[];
  allTags: string[];
  currentClerkUserId: string;
  isAdmin?: boolean;
};

export function UsersTable({ users, allTags, currentClerkUserId, isAdmin = false }: Props) {
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((user) => {
      // Search filter
      if (
        q &&
        !user.name.toLowerCase().includes(q) &&
        !user.email.toLowerCase().includes(q)
      ) {
        return false;
      }
      // Tag filter
      if (
        selectedTags.length > 0 &&
        !selectedTags.some((tag) => user.tags.includes(tag))
      ) {
        return false;
      }
      return true;
    });
  }, [users, search, selectedTags]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {allTags.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Tags
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                {allTags.map((tag) => (
                  <label
                    key={tag}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => toggleTag(tag)}
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
        {selectedTags.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-muted-foreground"
            onClick={() => setSelectedTags([])}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Linked Clients</TableHead>
              <TableHead>Last Sign In</TableHead>
              <TableHead className="w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.imageUrl} />
                        <AvatarFallback>
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleSelect
                      userId={user.id}
                      currentRole={user.role}
                      isCurrentUser={user.id === currentClerkUserId}
                      isAdmin={isAdmin}
                    />
                  </TableCell>
                  <TableCell>
                    <UserTags
                      userId={user.id}
                      tags={user.tags}
                      allTags={allTags}
                    />
                  </TableCell>
                  <TableCell>
                    {user.linkedClients.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.linkedClients.map((c) => (
                          <Badge
                            key={c.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastSignInAt
                      ? format(new Date(user.lastSignInAt), "MMM d, yyyy")
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <EditUserDialog user={user} isAdmin={isAdmin}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </EditUserDialog>
                      {user.id !== currentClerkUserId && (
                        <>
                          <DeleteUserButton
                            userId={user.id}
                            userName={user.name}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DeleteUserButton>
                          {isAdmin && (
                            <ImpersonateButton
                              userId={user.id}
                              userName={user.name}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
