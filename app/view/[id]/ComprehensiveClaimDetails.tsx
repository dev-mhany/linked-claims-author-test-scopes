/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  CircularProgress,
  Typography,
  useMediaQuery,
  Button,
  Collapse,
  Container,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Link as MuiLink
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { SVGDate, SVGBadge, CheckMarkSVG, LineSVG } from '../../Assets/SVGs'
import { useSession } from 'next-auth/react'
import useGoogleDrive from '../../hooks/useGoogleDrive'
import Image from 'next/image'
import { ExpandLess, ExpandMore } from '@mui/icons-material'
import { getVCWithRecommendations } from '@cooperation/vc-storage'
import EvidencePreview from './EvidencePreview'

// Define types
interface Portfolio {
  name: string
  url: string
}

interface Achievement {
  name: string
  description: string
  criteria?: { narrative: string }
  image?: { id: string }
}

interface CredentialSubject {
  name: string
  achievement?: Achievement[]
  duration?: string
  portfolio?: Portfolio[]
  createdTime?: string
  evidenceLink?: string
  howKnow?: string
  recommendationText?: string
  qualifications?: string
  explainAnswer?: string
}

interface ClaimDetail {
  data: {
    '@context': string[]
    id: string
    type: string[]
    issuanceDate: string
    expirationDate: string
    credentialSubject: CredentialSubject
  }
}

interface ComprehensiveClaimDetailsProps {
  onAchievementLoad?: (achievementName: string) => void
}

const cleanHTML = (htmlContent: any): string => {
  if (typeof htmlContent !== 'string') {
    return ''
  }
  return htmlContent
    .replace(/<p><br><\/p>/g, '')
    .replace(/<p><\/p>/g, '')
    .replace(/<br>/g, '')
    .replace(/class="[^"]*"/g, '')
    .replace(/style="[^"]*"/g, '')
}

const ComprehensiveClaimDetails: React.FC<ComprehensiveClaimDetailsProps> = ({
  onAchievementLoad
}) => {
  const params = useParams()
  const fileID = params?.id as string
  const [claimDetail, setClaimDetail] = useState<ClaimDetail | null>(null)
  const [comments, setComments] = useState<ClaimDetail[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const theme = useTheme()
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('sm'))
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const accessToken = session?.accessToken
  const isAskForRecommendation = pathname?.includes('/askforrecommendation')
  const isView = pathname?.includes('/view')

  const { getContent, fetchFileMetadata, storage } = useGoogleDrive()

  // State to manage expanded comments
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    if (!fileID) {
      setErrorMessage('Invalid claim ID.')
      setLoading(false)
      return
    }

    if (status === 'loading') {
      return
    }

    if (status === 'unauthenticated') {
      setLoading(false)
      return
    }

    if (!accessToken) {
      setErrorMessage('You need to log in to view this content.')
      setLoading(false)
      return
    }

    const fetchDriveData = async () => {
      try {
        const content = await getContent(fileID)

        if (content) {
          setClaimDetail(content as unknown as ClaimDetail)
          const achievementName = content?.data?.credentialSubject?.achievement?.[0]?.name
          if (achievementName && onAchievementLoad) {
            onAchievementLoad(achievementName)
          }
        }

        await fetchFileMetadata(fileID, '')

        //todo get recommendations from RELATIONS file recommendation array
        if (!storage || !fileID) {
          console.warn('Storage instance is not available.')
          return
        }
        const type = window.location.pathname.includes('view')
        if (type) {
          const { recommendations } = await getVCWithRecommendations({
            vcId: fileID,
            storage
          })
          console.log('🚀 ~ fetchDriveData ~ recommendations:', recommendations)
          if (recommendations) {
            setComments(recommendations as any)
          }
        }
      } catch (error) {
        console.error('Error fetching claim details:', error)
        setErrorMessage('Failed to fetch claim details.')
      } finally {
        setLoading(false)
      }
    }

    fetchDriveData()
  }, [
    accessToken,
    fileID,
    getContent,
    fetchFileMetadata,
    status,
    storage,
    isView,
    onAchievementLoad
  ])

  const handleToggleComment = (commentId: string) => {
    setExpandedComments(prevState => ({
      ...prevState,
      [commentId]: !prevState[commentId]
    }))
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

if (status === 'unauthenticated') {
  return (
    <Container sx={{ maxWidth: '800px' }}>
      <Typography variant='h6' align='center'>
        Please sign in to view this claim.
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}></Box>
      <Alert 
        severity="info" 
        sx={{ 
          mt: 2,
          backgroundColor: 'transparent',
          border: 'none',
          '& .MuiAlert-icon': {
            color: (theme) => theme.palette.t3BodyText,
          },
          '& .MuiAlert-message': {
            color: (theme) => theme.palette.t3BodyText,
            fontFamily: 'Lato',
            fontSize: '14px',
            textAlign: 'center',
          },
          width: '100%',
        }}
      >
        Our app is currently in development mode with Google. You may see a warning that the app is not verified - this is normal during our development phase. While we work on getting verified, you can safely proceed by clicking &quot;Continue&quot; on the warning screen, then &quot;Continue&quot; again on the &quot;Google hasn&#39;t verified this app&quot; screen. Your data remains secure and protected by Google&#39;s security measures.
      </Alert>
    </Container>
  )
}

  if (errorMessage) {
    return (
      <Typography variant='h6' color='error' align='center' sx={{ mt: 4 }}>
        {errorMessage}
      </Typography>
    )
  }

  setTimeout(() => {
    if (!claimDetail) {
      return (
        <Typography variant='h6' align='center' sx={{ mt: 4 }}>
          No claim details available.
        </Typography>
      )
    }
  }, 2000)

  const credentialSubject = claimDetail?.data?.credentialSubject
  const achievement = credentialSubject?.achievement && credentialSubject.achievement[0]
  const hasValidEvidence =
    credentialSubject?.portfolio && credentialSubject?.portfolio.length > 0

  return (
    <Container sx={{ maxWidth: '800px' }}>
      {claimDetail && (
        <Box
          sx={{
            p: isAskForRecommendation ? '5px' : '20px',
            gap: '20px',
            margin: '20px auto 0',
            border: '1px solid #003FE0',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: isAskForRecommendation ? 'center' : 'flex-start'
          }}
        >
          {isAskForRecommendation && (
            <Box
              sx={{
                width: credentialSubject?.evidenceLink ? '30%' : '0',
                marginRight: credentialSubject?.evidenceLink ? '20px' : '15px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
              }}
            >
              {credentialSubject?.evidenceLink ? (
                <EvidencePreview
                  url={credentialSubject.evidenceLink}
                  width={180}
                  height={150}
                />
              ) : (
                <Box
                  sx={{ width: '15px', height: '100px', backgroundColor: 'transparent' }}
                />
              )}
            </Box>
          )}

          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                justifyContent: 'center'
              }}
            >
              <Box sx={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <SVGBadge />
                <Typography
                  sx={{ color: 't3BodyText', fontSize: '24px', fontWeight: 700 }}
                >
                  {credentialSubject?.name} has claimed:
                </Typography>
              </Box>
              <Typography
                sx={{ color: 't3BodyText', fontSize: '24px', fontWeight: 700, mt: 2 }}
              >
                {achievement?.name ?? 'Unnamed Achievement'}
              </Typography>
            </Box>

            {credentialSubject?.duration && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '2px 5px',
                  borderRadius: '5px',
                  width: 'fit-content',
                  mb: '10px',
                  bgcolor: '#d5e1fb',
                  mt: 2
                }}
              >
                <Box sx={{ mt: '2px' }}>
                  <SVGDate />
                </Box>
                <Typography sx={{ color: 't3BodyText', fontSize: '13px' }}>
                  {credentialSubject?.duration}
                </Typography>
              </Box>
            )}

            {!isAskForRecommendation && (
              <>
                {credentialSubject?.evidenceLink && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: isLargeScreen ? 'row' : 'column',
                      gap: '20px',
                      my: '10px',
                      justifyContent: 'center'
                    }}
                  >
                    <EvidencePreview
                      url={credentialSubject.evidenceLink}
                      width={180}
                      height={150}
                    />
                  </Box>
                )}

                {achievement?.description && (
                  <Link href={credentialSubject?.evidenceLink ?? ''} target='_blank'>
                    <Typography
                      sx={{
                        cursor: 'pointer',
                        fontFamily: 'Lato',
                        fontSize: '17px',
                        letterSpacing: '0.075px',
                        lineHeight: '24px',
                        mt: 2
                      }}
                    >
                      <span
                        dangerouslySetInnerHTML={{
                          __html: cleanHTML(achievement.description)
                        }}
                      />
                    </Typography>
                  </Link>
                )}

                {achievement?.criteria?.narrative && (
                  <Box sx={{ mt: 2 }}>
                    <Typography>What does that entail?:</Typography>
                    <ul style={{ marginLeft: '25px' }}>
                      <li>
                        <span
                          dangerouslySetInnerHTML={{
                            __html: cleanHTML(achievement?.criteria?.narrative)
                          }}
                        />
                      </li>
                    </ul>
                  </Box>
                )}

                {hasValidEvidence && (
                  <Box sx={{ mt: 3 }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      Supporting Evidence / Portfolio:
                    </Typography>
                    <ul
                      style={{
                        marginLeft: '25px',
                        textDecorationLine: 'underline',
                        color: 'blue'
                      }}
                    >
                      {credentialSubject?.portfolio?.map((portfolioItem, idx) => (
                        <li
                          key={`main-portfolio-${idx}`}
                          style={{
                            cursor: 'pointer',
                            width: 'fit-content',
                            marginBottom: '10px'
                          }}
                        >
                          <Link
                            href={portfolioItem.url}
                            target='_blank'
                            rel='noopener noreferrer'
                          >
                            {portfolioItem.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
              </>
            )}

            {pathname?.includes('/claims') && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Link href={`/view/${fileID}`}>
                  <Button
                    variant='contained'
                    sx={{
                      backgroundColor: '#003FE0',
                      textTransform: 'none',
                      borderRadius: '100px'
                    }}
                  >
                    View Credential
                  </Button>
                </Link>
                <Link href={`/askforrecommendation/${fileID}`}>
                  <Button
                    variant='contained'
                    sx={{
                      backgroundColor: '#003FE0',
                      textTransform: 'none',
                      borderRadius: '100px'
                    }}
                  >
                    Ask for Recommendation
                  </Button>
                </Link>
              </Box>
            )}

            {pathname?.includes('/view') && claimDetail && (
              <Box
                sx={{ display: 'flex', flexDirection: 'column', gap: '4px', mt: '20px' }}
              >
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#000E40' }}>
                  Credential Details
                </Typography>
                <Box
                  sx={{ display: 'flex', gap: '5px', mt: '10px', alignItems: 'center' }}
                >
                  <Box sx={{ borderRadius: '4px', bgcolor: '#C2F1BE', p: '4px' }}>
                    <CheckMarkSVG />
                  </Box>
                  <Typography>Has a valid digital signature</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <Box sx={{ borderRadius: '4px', bgcolor: '#C2F1BE', p: '4px' }}>
                    <CheckMarkSVG />
                  </Box>
                  <Typography>Has not expired</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <Box sx={{ borderRadius: '4px', bgcolor: '#C2F1BE', p: '4px' }}>
                    <CheckMarkSVG />
                  </Box>
                  <Typography>Has not been revoked by issuer</Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Comments Section */}

      {isView && claimDetail && (
        <Box>
          {loading ? (
            <Box display='flex' justifyContent='center' my={2}>
              <CircularProgress size={24} />
            </Box>
          ) : comments && comments.length > 0 ? (
            <List sx={{ p: 0, mb: 2 }}>
              {comments.map((comment: ClaimDetail, index: number) => (
                <React.Fragment key={index}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      pr: '30px'
                    }}
                  >
                    <LineSVG />
                  </Box>
                  <ListItem
                    sx={{ borderRadius: '10px', border: '1px solid #003FE0' }}
                    alignItems='flex-start'
                    secondaryAction={
                      <IconButton
                        edge='end'
                        onClick={() =>
                          handleToggleComment(comment.data.id || index.toString())
                        }
                        aria-label='expand'
                      >
                        {expandedComments[comment.data.id || index.toString()] ? (
                          <ExpandLess />
                        ) : (
                          <ExpandMore />
                        )}
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <SVGBadge />
                          <Box>
                            <Typography variant='h6' component='div'>
                              {comment.data.credentialSubject?.name}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                              Vouched for {credentialSubject?.name}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  <Collapse
                    in={expandedComments[comment.data.id || index.toString()]}
                    timeout='auto'
                    unmountOnExit
                  >
                    <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                      {/* How They Know Each Other */}
                      {comment.data.credentialSubject?.howKnow && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant='subtitle2' color='text.secondary'>
                            How They Know Each Other:
                          </Typography>
                          <Typography variant='body2'>
                            <span
                              dangerouslySetInnerHTML={{
                                __html: cleanHTML(comment.data.credentialSubject.howKnow)
                              }}
                            />
                          </Typography>
                        </Box>
                      )}
                      {/* Recommendation Text */}
                      {comment.data.credentialSubject?.recommendationText && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant='subtitle2' color='text.secondary'>
                            Recommendation:
                          </Typography>
                          <Typography variant='body2'>
                            <span
                              dangerouslySetInnerHTML={{
                                __html: cleanHTML(
                                  comment.data.credentialSubject.recommendationText
                                )
                              }}
                            />
                          </Typography>
                        </Box>
                      )}
                      {/* Your Qualifications */}
                      {comment.data.credentialSubject?.qualifications && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant='subtitle2' color='text.secondary'>
                            Your Qualifications:
                          </Typography>
                          <Typography variant='body2'>
                            <span
                              dangerouslySetInnerHTML={{
                                __html: cleanHTML(
                                  comment.data.credentialSubject.qualifications
                                )
                              }}
                            />
                          </Typography>
                        </Box>
                      )}
                      {/* Explain Your Answer */}
                      {comment.data.credentialSubject?.explainAnswer && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant='subtitle2' color='text.secondary'>
                            Explain Your Answer:
                          </Typography>
                          <Typography variant='body2'>
                            <span
                              dangerouslySetInnerHTML={{
                                __html: cleanHTML(
                                  comment.data.credentialSubject.explainAnswer
                                )
                              }}
                            />
                          </Typography>
                        </Box>
                      )}
                      {/* Supporting Evidence */}
                      {Array.isArray(comment.data.credentialSubject?.portfolio) &&
                        comment.data.credentialSubject.portfolio.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant='subtitle2' color='text.secondary'>
                              Supporting Evidence:
                            </Typography>
                            {comment.data.credentialSubject.portfolio.map((item, idx) => (
                              <Box key={`comment-portfolio-${idx}`} sx={{ mt: 1 }}>
                                {item.name && item.url ? (
                                  <MuiLink
                                    href={item.url}
                                    underline='hover'
                                    color='primary'
                                    sx={{
                                      fontSize: '15px',
                                      textDecoration: 'underline',
                                      color: '#003fe0'
                                    }}
                                    target='_blank'
                                  >
                                    {item.name}
                                  </MuiLink>
                                ) : null}
                              </Box>
                            ))}
                          </Box>
                        )}
                    </Box>
                  </Collapse>
                  {/* Add Divider between comments */}
                  {index < comments.length - 1 && <Divider component='li' />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                mb: '20px'
              }}
            >
              <Typography variant='body2'>No recommendations available.</Typography>
              <Link href={`/askforrecommendation/${fileID}`}>
                <Button
                  variant='contained'
                  sx={{
                    backgroundColor: '#003FE0',
                    textTransform: 'none',
                    borderRadius: '100px',
                    width: { xs: 'fit-content', sm: '300px', md: '300px' }
                  }}
                >
                  Ask for Recommendation
                </Button>
              </Link>
            </Box>
          )}
        </Box>
      )}
    </Container>
  )
}

export default ComprehensiveClaimDetails
