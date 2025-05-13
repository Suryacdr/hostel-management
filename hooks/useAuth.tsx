"use client"

import { useState, useEffect } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "../lib/firebase"

export interface AuthUser extends User {
    role?: 'superAdmin' | 'admin' | 'coAdmin' | 'student'
}

export function useAuth() {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
        setError(null);
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    try {
                        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
                        const userData = userDoc.data()
                        setUser({ ...firebaseUser, role: userData?.role })
                        setIsAuthenticated(true)
                    } catch (err) {
                        console.error("Error fetching user data:", err)
                        // Still set the user without role data if Firestore fetch fails
                        setUser(firebaseUser as AuthUser)
                        setIsAuthenticated(true)
                        setError("Could not fetch complete user profile")
                    }
                } else {
                    setUser(null)
                    setIsAuthenticated(false)
                }
            } catch (err) {
                console.error("Auth state change error:", err)
                setError(err instanceof Error ? err.message : "Authentication error")
                setUser(null)
                setIsAuthenticated(false)
            } finally {
                setLoading(false)
            }
        })

        return () => unsubscribe()
    }, [])

    return { user, loading, error, isAuthenticated }
}

