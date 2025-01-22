
Yanawa-flatform
-
링크 https://yanawa.shop/

사용자의 시간표 정보 및 친구 목록을 기반으로  번개모임을 생성해주는 플랫폼

시간표 스케줄링 및 푸쉬 알림 서비스, 번개모임에 대한 채팅방 서비스 제공





프로젝트 아키텍쳐
-
![image](https://github.com/user-attachments/assets/947d47f2-4469-4c1c-a09c-3d69b4c29ee5)


기능
-
로그인기능
--
![image](https://github.com/user-attachments/assets/c4b0d309-1dca-44b1-8d19-a25399bf2c8c)

구글 Oauth API를 이용한 로그인

로그인 검증 후, 해당 서비스 이용 가능

로그아웃

스케줄 기능
--
![image](https://github.com/user-attachments/assets/8638cd70-3f73-4208-8d57-b24ecb5733a1)

사용자의 일정에 맞게 고정/유동 스케줄 생성

매주 유동 스케줄 초기화

전체/개별 스케줄 조회

스케줄 수정/삭제

![image](https://github.com/user-attachments/assets/b8c88283-e272-44a8-85ef-8f57462c860c)

Pagination을 통한 사용자의 친구 조회 

이메일을 통한 친구 요청

친구  요청 목록을 확인하여 수락/거절

친구 삭제

모임 기능 
--
![image](https://github.com/user-attachments/assets/79345bf1-87d8-47c5-8640-eecef6c117aa)
Pagination을 이용한 전체/참여 모임 조회

친구 초대를 활용한 모임 생성-> 생성 모임 시간에 여유로운 친구에게 알림 연동

자유로운 모임 참여/탈퇴

인원을 그만 받고 싶다면? 모임 마감
![image](https://github.com/user-attachments/assets/2fcbd4b4-914f-40cd-946f-934e80625d12)

번개 모임 참여 후 자동적으로 채팅방 참여


채팅 내용 검색 & 공지 기능

읽은 사람 수 확인 가능

웹소켓, fcm을 사용한 

실시간 채팅 및 푸시 알림(메시지큐(rabbitmq)를 활용한 부하 방지) 

일반 API 서버, 채팅 서버, 푸시 서버 분리

ERD
--
![image](https://github.com/user-attachments/assets/a6305ff6-ac1d-4ad8-9e0d-b04878438add)

최적화를 통한 성능 개선
--
![image](https://github.com/user-attachments/assets/4a34ecc1-3018-4096-b621-4062b1079328)

![image](https://github.com/user-attachments/assets/9834c874-0c1a-4ac7-9cb8-6f0017955fe1)

문제점
--
리액트, API서버, 채팅 서버, https 로직 전부 단일 Ec2 인스턴스에서 실행으로 인한 과부하 

★ 해결 방안 ⇒ 프론트 도메인 Vercel,Aws S3를 이용하여 분리, 추가로 ec2에 대해 로드밸런서  적용

프리티어 ec2인스턴스의 cpu개수 제한(1개)으로 인한 클러스터링 불가 

★ 해결 방안 ⇒ 다수의 ec2 인스턴스를 두어 api,채팅 서버 분리 및 Nginx를 이용한 트래픽 분배

**향후 계획** 

추후 스프링 부트로 리팩토링 후 로드밸런싱을 적용하여 정식으로 서비스를 오픈해볼 생각입니다 


